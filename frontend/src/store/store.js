import { create } from 'zustand';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const useChatStore = create((set, get) => ({
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  updateMessage: (index, newMsg) =>
    set((state) => {
      const messages = [...state.messages];
      messages[index] = { ...messages[index], ...newMsg };
      return { messages };
    }),
  removeMessage: (index) =>
    set((state) => {
      const messages = [...state.messages];
      messages.splice(index, 1);
      return { messages };
    }),
  
  message: { author: '', content: '' },
  setMessage: (msg) => set({ message: msg }),
  
  // Auth user info
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  
  // Contacts and chats
  contacts: [],
  setContacts: (contacts) => set({ contacts }),
  recentChats: [],
  setRecentChats: (chats) => set({ recentChats }),
  activeChat: null,
  setActiveChat: (chat) => set({ activeChat: chat }),
  selectedContact: null,
  setSelectedContact: (contact) => set({ selectedContact: contact }),
  
  // UI State
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  selectedFile: null,
  setSelectedFile: (file) => set({ selectedFile: file }),
  filePreview: null,
  setFilePreview: (preview) => set({ filePreview: preview }),
  fileType: null,
  setFileType: (type) => set({ fileType: type }),
  fileName: '',
  setFileName: (name) => set({ fileName: name }),
  isUploading: false,
  setIsUploading: (val) => set({ isUploading: val }),
  
  // API calls
  fetchContacts: async () => {
    try {
      const currentUser = get().currentUser;
      if (!currentUser) return;
      
      const response = await fetch(`${API_URL}/api/users/${currentUser.id}/contacts`);
      const contacts = await response.json();
      set({ contacts });
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  },
  
  fetchRecentChats: async () => {
    try {
      const currentUser = get().currentUser;
      if (!currentUser) return;
      
      const response = await fetch(`${API_URL}/api/users/${currentUser.id}/chats`);
      const chats = await response.json();
      set({ recentChats: chats });
    } catch (error) {
      console.error('Error fetching recent chats:', error);
    }
  },
  
  fetchChatMessages: async (contactId) => {
    try {
      const currentUser = get().currentUser;
      if (!currentUser) return;
      
      const response = await fetch(`${API_URL}/api/chats/${currentUser.id}/${contactId}`);
      const chat = await response.json();
      
      // Transform messages to match frontend format
      const transformedMessages = chat.messages.map(msg => ({
        _id: msg._id,
        userId: msg.sender.authId,
        author: msg.sender.name,
        email: msg.sender.email,
        picture: msg.sender.picture,
        content: msg.content,
        file: msg.file,
        timestamp: msg.timestamp
      }));
      
      set({ 
        messages: transformedMessages,
        activeChat: chat
      });
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    }
  }
}));

export default useChatStore;