import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Chat from './models/Chat.js';

dotenv.config();

const PORT = process.env.PORT || 8080;
const app = express();
const server = http.createServer(app);

// Updated CORS configuration for production
app.use(cors({
  origin: [
    "http://localhost:5173", // Development
    "https://your-app-name.vercel.app", // Replace with your actual Vercel URL
  ],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const io = new Server(server, {
    cors: {
        origin: [
          "http://localhost:5173", // Development
          "https://your-app-name.vercel.app", // Replace with your actual Vercel URL
        ],
        methods: ["GET", "POST"],
        maxHttpBufferSize: 50 * 1024 * 1024, // 50MB
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

// Store active socket connections
const activeUsers = new Map();

// API Routes
// Get or create user
app.post('/api/users', async (req, res) => {
  try {
    const { authId, name, email, picture, nickname } = req.body;
    
    let user = await User.findOne({ authId });
    if (!user) {
      user = new User({ authId, name, email, picture, nickname });
      await user.save();
    } else {
      // Update user info
      user.name = name;
      user.email = email;
      user.picture = picture;
      user.nickname = nickname;
      await user.save();
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user contacts
app.get('/api/users/:userId/contacts', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get all users except current user as potential contacts
    const contacts = await User.find({ 
      authId: { $ne: userId } 
    }).select('authId name email picture nickname isOnline lastSeen');
    
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get chat between two users
app.get('/api/chats/:userId/:contactId', async (req, res) => {
  try {
    const { userId, contactId } = req.params;
    
    // Find users
    const user = await User.findOne({ authId: userId });
    const contact = await User.findOne({ authId: contactId });
    
    if (!user || !contact) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Find existing chat
    let chat = await Chat.findOne({
      participants: { $all: [user._id, contact._id] }
    }).populate('participants', 'authId name email picture')
      .populate('messages.sender', 'authId name email picture');
    
    if (!chat) {
      // Create new chat
      chat = new Chat({
        participants: [user._id, contact._id],
        messages: []
      });
      await chat.save();
      await chat.populate('participants', 'authId name email picture');
    }
    
    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's recent chats
app.get('/api/users/:userId/chats', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ authId: userId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const chats = await Chat.find({
      participants: user._id,
      'messages.0': { $exists: true } // Only chats with messages
    }).populate('participants', 'authId name email picture isOnline lastSeen')
      .populate('lastMessage.sender', 'authId name')
      .sort({ 'lastMessage.timestamp': -1 });
    
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket Events
io.on("connection", socket => {
    console.log("User Connected, " + socket.id);

    socket.on("user_joined", async (userData) => {
        try {
            activeUsers.set(socket.id, userData);
            
            // Update user online status
            await User.findOneAndUpdate(
                { authId: userData.userId },
                { isOnline: true, lastSeen: new Date() }
            );
            
            console.log(`User ${userData.name} (${userData.email}) joined`);
            
            // Join user to their personal room
            socket.join(userData.userId);
            
            // Notify contacts about online status
            socket.broadcast.emit("user_status_changed", {
                userId: userData.userId,
                isOnline: true
            });
            
        } catch (error) {
            console.error('Error handling user_joined:', error);
        }
    });

    socket.on("join_chat", (chatId) => {
        socket.join(chatId);
        console.log(`User joined chat: ${chatId}`);
    });

    socket.on("send_message", async (messageData) => {
        try {
            const { senderId, receiverId, content, file, tempId } = messageData;
            
            console.log('Received message data:', { 
                senderId, 
                receiverId, 
                hasFile: !!file, 
                tempId,
                contentLength: content?.length || 0,
                fileSize: file?.size || 0
            });
            
            // Validate message data
            if (!senderId || !receiverId) {
                console.error('Missing sender or receiver ID');
                socket.emit("message_error", { 
                    message: "Invalid sender or receiver",
                    tempId 
                });
                return;
            }

            if (!content?.trim() && !file) {
                console.error('Empty message content and no file');
                socket.emit("message_error", { 
                    message: "Message cannot be empty",
                    tempId 
                });
                return;
            }
            
            // Find users
            const sender = await User.findOne({ authId: senderId });
            const receiver = await User.findOne({ authId: receiverId });
            
            if (!sender || !receiver) {
                console.error('User not found:', { senderId, receiverId });
                socket.emit("message_error", { 
                    message: "User not found",
                    tempId 
                });
                return;
            }
            
            // Find or create chat
            let chat = await Chat.findOne({
                participants: { $all: [sender._id, receiver._id] }
            });
            
            if (!chat) {
                chat = new Chat({
                    participants: [sender._id, receiver._id],
                    messages: []
                });
            }
            
            // Process file if present
            let processedFile = null;
            if (file) {
                try {
                    // Validate file data
                    if (!file.data || !file.name) {
                        throw new Error('Invalid file data');
                    }
                    
                    // Check file size (limit to 10MB)
                    if (file.size > 10 * 1024 * 1024) {
                        throw new Error('File too large (max 10MB)');
                    }
                    
                    // Ensure we're storing the file correctly
                    processedFile = {
                        data: file.data,        // This should be the base64 string
                        name: file.name,        // File name
                        type: file.type,        // MIME type
                        size: file.size,        // File size in bytes
                        fileType: file.fileType // Our custom file type
                    };
                    
                    console.log('File processed successfully:', {
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        fileType: file.fileType,
                        dataLength: file.data?.length || 0
                    });
                } catch (fileError) {
                    console.error('File processing error:', fileError);
                    socket.emit("message_error", { 
                        message: `File error: ${fileError.message}`,
                        tempId 
                    });
                    return;
                }
            }
            
            // Create message - make sure file is structured correctly
            const message = {
                sender: sender._id,
                content: content?.trim() || '',
                timestamp: new Date(),
                isDelivered: true
            };
            
            // Only add file if it exists and is processed correctly
            if (processedFile) {
                message.file = processedFile;
            }
            
            chat.messages.push(message);
            chat.lastMessage = {
                content: content?.trim() || (processedFile ? `📎 ${processedFile.name}` : ''),
                sender: sender._id,
                timestamp: new Date()
            };
            
            // Save the chat
            await chat.save();
            console.log('Message saved to database successfully');
            
            // Get the saved message with populated sender
            const savedChat = await Chat.findById(chat._id)
                .populate('messages.sender', 'authId name email picture');
            
            const savedMessage = savedChat.messages[savedChat.messages.length - 1];
            
            const messageResponse = {
                _id: savedMessage._id,
                userId: sender.authId,
                author: sender.name,
                email: sender.email,
                picture: sender.picture,
                content: savedMessage.content,
                file: savedMessage.file,
                timestamp: savedMessage.timestamp,
                chatId: chat._id,
                tempId // Include tempId for frontend tracking
            };
            
            console.log('Sending message to receiver:', receiverId);
            // Send to receiver (don't include tempId for receiver)
            const receiverMessage = { ...messageResponse };
            delete receiverMessage.tempId;
            socket.to(receiverId).emit("receive_message", receiverMessage);
            
            console.log('Sending confirmation to sender with tempId:', tempId);
            // Send confirmation to sender (include tempId for replacement)
            socket.emit("message_confirmed", messageResponse);
            
            console.log(`Message sent successfully from ${sender.name} to ${receiver.name}`);
            
        } catch (error) {
            console.error('Error handling send_message:', error);
            socket.emit("message_error", { 
                message: "Failed to send message: " + error.message,
                tempId: messageData.tempId
            });
        }
    });

    socket.on("disconnect", async () => {
        try {
            const userData = activeUsers.get(socket.id);
            if (userData) {
                // Update user offline status
                await User.findOneAndUpdate(
                    { authId: userData.userId },
                    { isOnline: false, lastSeen: new Date() }
                );
                
                // Notify contacts about offline status
                socket.broadcast.emit("user_status_changed", {
                    userId: userData.userId,
                    isOnline: false
                });
                
                activeUsers.delete(socket.id);
                console.log(`User ${userData.name} disconnected`);
            }
        } catch (error) {
            console.error('Error handling disconnect:', error);
        }
        
        console.log("User Disconnected, " + socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

