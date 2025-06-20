import React, { useRef } from 'react';
import useChatStore from '../store/store';
import { useSocket } from '../context/context';

function ChatInput() {
  const {
    message,
    setMessage,
    selectedFile,
    setSelectedFile,
    filePreview,
    setFilePreview,
    fileType,
    setFileType,
    fileName,
    setFileName,
    isUploading,
    setIsUploading,
    currentUser,
    selectedContact,
    addMessage,
  } = useChatStore();

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const socket = useSocket();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large! Please select a file under 10MB.");
      return;
    }

    setFileName(file.name);

    const fileExt = file.name.split('.').pop().toLowerCase();
    let detectedFileType = 'file';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExt)) {
      detectedFileType = 'image';
    } else if (['pdf'].includes(fileExt)) {
      detectedFileType = 'pdf';
    } else if (['doc', 'docx'].includes(fileExt)) {
      detectedFileType = 'doc';
    } else if (['xls', 'xlsx'].includes(fileExt)) {
      detectedFileType = 'excel';
    } else if (['ppt', 'pptx'].includes(fileExt)) {
      detectedFileType = 'powerpoint';
    } else if (['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(fileExt)) {
      detectedFileType = 'audio';
    } else if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(fileExt)) {
      detectedFileType = 'video';
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(fileExt)) {
      detectedFileType = 'archive';
    }
    
    setFileType(detectedFileType);

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedFile({
        data: reader.result,
        name: file.name,
        type: file.type,
        size: file.size
      });
      
      if (detectedFileType === 'image') {
        setFilePreview(reader.result);
      } else {
        setFilePreview(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!socket || !socket.connected) {
      alert("Not connected to server. Please refresh the page.");
      return;
    }

    if (!currentUser || !selectedContact) {
      alert("Please select a contact to send message.");
      return;
    }

    if (!message?.content?.trim() && !selectedFile) return;

    const hasFile = !!selectedFile;
    if (hasFile) {
      setIsUploading(true);
    }

    // Generate unique temp ID for tracking
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Prepare message to send to server
    const msgToSend = {
      senderId: currentUser.id,
      receiverId: selectedContact.authId,
      content: message?.content || '',
      tempId, // Include tempId in the message sent to server
    };

    // Only add file to message if one is selected
    if (selectedFile) {
      msgToSend.file = {
        data: selectedFile.data,
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        fileType: fileType,
      };
    }

    // Create temporary message for UI - only include file if one exists
    const tempMessage = {
      tempId, // Add tempId for tracking
      userId: currentUser.id,
      author: currentUser.name,
      email: currentUser.email,
      picture: currentUser.picture,
      content: msgToSend.content,
      loading: hasFile, // Only show loading for files
      timestamp: new Date().toISOString()
    };

    // Only add file to temp message if one exists
    if (selectedFile) {
      tempMessage.file = msgToSend.file;
    }

    console.log('Adding temp message with tempId:', tempId);
    addMessage(tempMessage);
    
    console.log('Sending message to server with tempId:', tempId);
    socket.emit("send_message", msgToSend);

    // Clear input
    setMessage({ author: currentUser.name, content: "" });
    setSelectedFile(null);
    setFilePreview(null);
    setFileType(null);
    setFileName("");
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const { selectionStart, selectionEnd } = e.target;
        const currentContent = message?.content || '';
        const newContent =
          currentContent.substring(0, selectionStart) +
          '\n' +
          currentContent.substring(selectionEnd);
        
        setMessage({ author: currentUser?.name, content: newContent });
        
        setTimeout(() => {
          e.target.selectionStart = e.target.selectionEnd = selectionStart + 1;
        }, 0);
      } else {
        e.preventDefault();
        handleSendMessage(e);
      }
    }
  };

  if (!selectedContact) {
    return null;
  }

  return (
    <div className='w-full px-6 self-center'>
      <form onSubmit={handleSendMessage} className='flex flex-col'>
        <div className='relative'>
          <textarea
            ref={textareaRef}
            className='w-full min-h-[50px] max-h-[120px] p-3 pr-20 rounded-md shadow-md border border-teal-700 bg-white resize-y'
            placeholder={`Message ${selectedContact.name}...`}
            value={message?.content || ""}
            onChange={(e) => setMessage({ author: currentUser?.name, content: e.target.value })}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isUploading}
          />
          <div className='absolute right-3 bottom-3 flex gap-2'>
            <label className={`cursor-pointer p-2 rounded-full bg-teal-500 text-white hover:bg-teal-600 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <input
                type="file"
                className="hidden"
                onChange={handleFileChange}
                ref={fileInputRef}
                disabled={isUploading}
              />
            </label>
            <button
              type="submit"
              className={`p-2 rounded-full bg-teal-500 text-white hover:bg-teal-600 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
              disabled={isUploading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default ChatInput;