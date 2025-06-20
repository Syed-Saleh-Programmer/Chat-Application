import React, { useEffect, useState } from 'react';
import useChatStore from '../store/store';

function Sidebar() {
  const {
    contacts,
    recentChats,
    selectedContact,
    currentUser,
    sidebarOpen,
    setSidebarOpen,
    setSelectedContact,
    fetchContacts,
    fetchRecentChats,
    fetchChatMessages
  } = useChatStore();

  const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'contacts'

  useEffect(() => {
    if (currentUser) {
      fetchContacts();
      fetchRecentChats();
    }
  }, [currentUser, fetchContacts, fetchRecentChats]);

  const handleContactClick = async (contact) => {
    setSelectedContact(contact);
    await fetchChatMessages(contact.authId);
    
    // Close sidebar on mobile after selecting contact
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const getLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
    return Math.floor(diff / 86400000) + 'd';
  };

  if (!sidebarOpen) {
    return null;
  }

  return (
    <div className={`
      fixed top-0 left-0 h-full w-80 bg-white shadow-2xl flex flex-col z-50
      transform transition-transform duration-300 ease-in-out
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:relative lg:translate-x-0 lg:shadow-lg
    `}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-lg hover:bg-gray-100 lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'chats'
                ? 'bg-white text-teal-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Recent Chats
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'contacts'
                ? 'bg-white text-teal-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            All Contacts
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'chats' ? (
          <div className="p-2">
            {recentChats.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No recent chats</p>
                <p className="text-sm">Start a conversation!</p>
              </div>
            ) : (
              recentChats.map((chat) => {
                const otherParticipant = chat.participants.find(
                  (p) => p.authId !== currentUser?.id
                );
                const isSelected = selectedContact?.authId === otherParticipant?.authId;
                
                return (
                  <div
                    key={chat._id}
                    onClick={() => handleContactClick(otherParticipant)}
                    className={`flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-teal-50 border-l-4 border-teal-500' : ''
                    }`}
                  >
                    <div className="relative">
                      {otherParticipant?.picture ? (
                        <img
                          src={otherParticipant.picture}
                          alt={otherParticipant.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {otherParticipant?.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      {otherParticipant?.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {otherParticipant?.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {getLastMessageTime(chat.lastMessage?.timestamp)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {chat.lastMessage?.content || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="p-2">
            {contacts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No contacts found</p>
              </div>
            ) : (
              contacts.map((contact) => {
                const isSelected = selectedContact?.authId === contact.authId;
                
                return (
                  <div
                    key={contact._id}
                    onClick={() => handleContactClick(contact)}
                    className={`flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-teal-50 border-l-4 border-teal-500' : ''
                    }`}
                  >
                    <div className="relative">
                      {contact.picture ? (
                        <img
                          src={contact.picture}
                          alt={contact.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {contact.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      {contact.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {contact.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {contact.isOnline ? 'Online' : `Last seen ${getLastMessageTime(contact.lastSeen)}`}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;