import React, { useEffect, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import MessageItem from './components/MessageItem';
import useChatStore from './store/store';
import { useSocket } from './context/context';
import ChatInput from './components/ChatInput';
import LoginButton from './components/LoginButton';
import LogoutButton from './components/LogoutButton';
import Sidebar from './components/Sidebar';

function App() {
  const {
    messages,
    addMessage,
    updateMessage,
    removeMessage,
    currentUser,
    setCurrentUser,
    selectedContact,
    filePreview,
    fileName,
    fileType,
    isUploading,
    setIsUploading,
    setSelectedFile,
    setFilePreview,
    setFileType,
    setFileName,
    sidebarOpen,
    setSidebarOpen,
    fetchRecentChats
  } = useChatStore();

  const { user, isAuthenticated, isLoading, logout } = useAuth0();
  const messagesEndRef = useRef(null);
  const socket = useSocket();

  // Set sidebar open by default on large screens, closed on mobile
  useEffect(() => {
    const handleResize = () => {
      const isLargeScreen = window.innerWidth >= 1024; // lg breakpoint
      setSidebarOpen(isLargeScreen);
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen]);

  // Set current user when authenticated
  useEffect(() => {
    const initializeUser = async () => {
      if (isAuthenticated && user) {
        const userData = {
          id: user.sub,
          name: user.name || user.email,
          email: user.email,
          picture: user.picture,
          nickname: user.nickname || user.name
        };
        
        setCurrentUser(userData);
        
        // Register user in database
        try {
          await fetch('http://localhost:8080/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              authId: userData.id,
              name: userData.name,
              email: userData.email,
              picture: userData.picture,
              nickname: userData.nickname
            })
          });
        } catch (error) {
          console.error('Error registering user:', error);
        }
      }
    };
    
    initializeUser();
  }, [isAuthenticated, user, setCurrentUser]);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket || !isAuthenticated || !currentUser) return;

    const handleReceiveMessage = (incomingMessage) => {
      console.log('Received message:', incomingMessage);
      addMessage(incomingMessage);
      fetchRecentChats();
    };

    const handleMessageConfirmed = (confirmedMessage) => {
      console.log('Message confirmed:', confirmedMessage);
      setIsUploading(false);
      
      // Find the temp message by tempId
      const currentMessages = useChatStore.getState().messages;
      const tempMessageIndex = currentMessages.findIndex((msg) => 
        msg.tempId === confirmedMessage.tempId
      );
      
      if (tempMessageIndex !== -1) {
        console.log('Updating temp message at index:', tempMessageIndex);
        // Replace the temp message with the confirmed message
        updateMessage(tempMessageIndex, { 
          ...confirmedMessage, 
          loading: false,
          tempId: undefined // Remove tempId after confirmation
        });
      } else {
        console.log('Temp message not found, adding confirmed message');
        // If temp message not found, add the confirmed message
        addMessage({
          ...confirmedMessage,
          loading: false
        });
      }
      
      fetchRecentChats();
    };

    const handleMessageError = (errorData) => {
      console.error('Message error:', errorData);
      setIsUploading(false);
      
      // Remove the failed temp message if it exists
      if (errorData.tempId) {
        const currentMessages = useChatStore.getState().messages;
        const tempMessageIndex = currentMessages.findIndex((msg) => 
          msg.tempId === errorData.tempId
        );
        
        if (tempMessageIndex !== -1) {
          removeMessage(tempMessageIndex);
        }
      }
      
      alert('Failed to send message: ' + errorData.message);
    };

    const handleUserStatusChanged = (statusData) => {
      console.log('User status changed:', statusData);
    };

    // Join user to socket
    socket.emit('user_joined', {
      userId: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      picture: currentUser.picture
    });

    // Add event listeners
    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_confirmed', handleMessageConfirmed);
    socket.on('message_error', handleMessageError);
    socket.on('user_status_changed', handleUserStatusChanged);

    // Cleanup
    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_confirmed', handleMessageConfirmed);
      socket.off('message_error', handleMessageError);
      socket.off('user_status_changed', handleUserStatusChanged);
    };
  }, [socket, addMessage, updateMessage, removeMessage, setIsUploading, isAuthenticated, currentUser, fetchRecentChats]);

  const handleRemoveFilePreview = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setFileType(null);
    setFileName("");
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = () => {
    logout({ returnTo: window.location.origin });
  };

  if (isLoading) {
    return (
      <div className='w-screen h-screen flex flex-col justify-center items-center bg-zinc-100'>
        <div className="flex items-center gap-2 text-teal-700">
          <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <span className="text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className='w-screen h-screen flex flex-col justify-center items-center bg-zinc-100'>
        <div className="text-center mb-8">
          <h1 className='text-4xl font-bold text-teal-700 mb-2'>WhatsUp Chat</h1>
          <p className='text-gray-600'>Connect with others in real-time</p>
        </div>
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className='text-2xl font-semibold mb-6 text-center'>Welcome!</h2>
          <p className='text-gray-600 mb-6 text-center'>Please sign in to join the chat</p>
          <LoginButton />
        </div>
      </div>
    );
  }

  // Chat UI
  return (
    <div className='w-screen h-screen flex bg-zinc-50 relative'>
      {/* Sidebar Overlay */}
      <Sidebar />
      
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Main Chat Area - Full width, sidebar overlays on top */}
      <div className='w-full flex flex-col'>
        {/* Header */}
        <div className='w-full py-3 px-4 sm:px-6 lg:px-8 bg-teal-500 flex justify-between items-center relative z-30'>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-teal-600 text-white transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Chat Title - Responsive sizing */}
            <h1 className='text-lg sm:text-xl lg:text-2xl font-bold text-white truncate'>
              {selectedContact ? selectedContact.name : 'WhatsUp Chat'}
            </h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Current User Avatar - Only show avatar, no name */}
            {currentUser?.picture && (
              <img 
                src={currentUser.picture} 
                alt={currentUser.name}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-white/20"
                title={currentUser.name} // Show name on hover
              />
            )}
            
            {/* Logout Icon Button */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-teal-600 text-white transition-colors flex-shrink-0"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {selectedContact ? (
          <>
            {/* Messages Container */}
            <div className='flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-10 flex flex-col gap-3 overflow-y-auto'>
              {messages.map((msg, i) => (
                <React.Fragment key={msg._id || msg.tempId || i}>
                  <MessageItem message={msg} isMe={msg.userId === currentUser?.id} />
                </React.Fragment>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* File Preview */}
            {(filePreview || fileName) && (
              <div className='w-[85%] self-center mb-2 relative'>
                <div className='relative inline-block bg-gray-100 p-2 rounded-md border border-gray-300'>
                  {filePreview ? (
                    <img 
                      src={filePreview} 
                      alt="Preview" 
                      className="h-20 rounded-md" 
                    />
                  ) : (
                    <div className="flex items-center gap-2 px-3">
                      <div className="text-3xl">
                        {fileType === 'pdf' && '📄'}
                        {fileType === 'doc' && '📝'}
                        {fileType === 'excel' && '📊'}
                        {fileType === 'powerpoint' && '📑'}
                        {fileType === 'audio' && '🎵'}
                        {fileType === 'video' && '🎬'}
                        {fileType === 'archive' && '📦'}
                        {fileType === 'file' && '📎'}
                      </div>
                      <span className="text-sm font-medium truncate max-w-[200px]">{fileName}</span>
                    </div>
                  )}
                  <button 
                    onClick={handleRemoveFilePreview}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Uploading Spinner */}
            {isUploading && (
              <div className="w-[85%] self-center mb-2 flex items-center gap-2 text-teal-700">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                <span>Uploading file...</span>
              </div>
            )}

            {/* Input */}
            <div className="pb-4 sm:pb-6">
              <ChatInput />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-gray-500">
              <div className="text-4xl sm:text-6xl mb-4">💬</div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Welcome to WhatsUp Chat</h3>
              <p className="text-sm sm:text-base">Select a contact from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
