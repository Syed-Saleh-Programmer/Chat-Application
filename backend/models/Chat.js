import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  file: {
    data: { type: String }, // Make sure this is an object with type String
    name: { type: String },
    type: { type: String },
    size: { type: Number },
    fileType: { type: String }
  },
  timestamp: { type: Date, default: Date.now },
  isDelivered: { type: Boolean, default: false },
  isRead: { type: Boolean, default: false }
});

const chatSchema = new mongoose.Schema({
  participants: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  }],
  messages: [messageSchema],
  lastMessage: {
    content: String,
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now }
  }
}, {
  timestamps: true
});

// Ensure only 2 participants per chat
chatSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    next(new Error('Chat must have exactly 2 participants'));
  }
  next();
});

export default mongoose.model('Chat', chatSchema);