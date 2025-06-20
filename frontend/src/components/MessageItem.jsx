import React from 'react';

function MessageItem({ message, isMe }) {
    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    };

    const downloadFile = (fileData, fileName) => {
        try {
            const link = document.createElement('a');
            link.href = fileData;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error downloading file:", error);
            alert("Failed to download file. Please try again.");
        }
    };

    const getFileIcon = (fileType) => {
        switch (fileType) {
            case 'pdf': return '📄';
            case 'doc': return '📝';
            case 'excel': return '📊';
            case 'powerpoint': return '📑';
            case 'audio': return '🎵';
            case 'video': return '🎬';
            case 'archive': return '📦';
            case 'image': return '🖼️';
            case 'file':
            default: return '📎';
        }
    };

    // Check if message actually has a file with valid data
    const hasValidFile = message.file && message.file.data && message.file.name;

    if (message.loading) {
        return (
            <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-start gap-2`}>
                {!isMe && (
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0"></div>
                )}
                <div
                    className={`w-fit px-3 py-2 rounded ${isMe ? 'bg-[#DCF8C6]' : 'bg-white'
                        } shadow text-base max-w-[300px] sm:max-w-[450px] md:max-w-[650px] text-wrap`}
                >
                    <div className="flex items-center gap-2 text-teal-700">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        <span className="text-xs">Sending...</span>
                    </div>
                </div>
                {isMe && (
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0"></div>
                )}
            </div>
        );
    }

    return (
        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-start gap-1`}>
            {!isMe && (
                <div className="w-8 h-8 flex-shrink-0 select-none">
                    {message.picture ? (
                        <img
                            src={message.picture}
                            alt={message.author}
                            className="w-full h-full rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-teal-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {message.author?.charAt(0)?.toUpperCase()}
                        </div>
                    )}
                </div>
            )}

            <div
                className={`w-fit px-3 py-2 rounded ${isMe ? 'bg-[#DCF8C6]' : 'bg-white'
                    } shadow text-base max-w-[300px] sm:max-w-[450px] md:max-w-[650px] text-wrap`}
            >
                {/* Only show author name for received messages (not current user's messages) */}
                {!isMe && (
                    <div className="flex items-center justify-between mb-[1px] select-none">
                        <span className="text-xs font-semibold text-teal-700">{message.author}</span>
                        <span className="text-xs text-gray-500 ml-2">{formatTime(message.timestamp)}</span>
                    </div>
                )}

                {/* For current user's messages, only show timestamp */}
                {isMe && (
                    <div className="flex justify-end mb-[1px] select-none">
                        <span className="text-xs text-gray-500 select-none">{formatTime(message.timestamp)}</span>
                    </div>
                )}

                {message.content && <div className="whitespace-pre-wrap break-words mb-[1px]">{message.content}</div>}

                {message.image && (
                    <div className="mt-1 select-none">
                        <img
                            src={message.image}
                            alt="Shared image"
                            className="max-w-full rounded-md"
                            style={{ maxHeight: '300px' }}
                        />
                    </div>
                )}

                {/* Only render file section if there's actually a valid file */}
                {hasValidFile && (
                    <div className="mt-2 border border-gray-200 rounded-md p-2 bg-gray-50 select-none">
                        {message.file.fileType === 'image' ? (
                            <div>
                                <img
                                    src={message.file.data}
                                    alt={message.file.name}
                                    className="max-w-full rounded-md mb-1"
                                    style={{ maxHeight: '300px' }}
                                />
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500 truncate max-w-[80%]">{message.file.name}</span>
                                    <button
                                        onClick={() => downloadFile(message.file.data, message.file.name)}
                                        className="text-xs text-teal-600 hover:text-teal-800"
                                    >
                                        Download
                                    </button>
                                </div>
                            </div>
                        ) : message.file.fileType === 'audio' ? (
                            <div>
                                <audio controls className="w-full max-w-[250px]">
                                    <source src={message.file.data} type={message.file.type} />
                                    Your browser does not support the audio element.
                                </audio>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-gray-500 truncate max-w-[80%]">{message.file.name}</span>
                                    <button
                                        onClick={() => downloadFile(message.file.data, message.file.name)}
                                        className="text-xs text-teal-600 hover:text-teal-800"
                                    >
                                        Download
                                    </button>
                                </div>
                            </div>
                        ) : message.file.fileType === 'video' ? (
                            <div>
                                <video controls className="max-w-full rounded-md" style={{ maxHeight: '300px' }}>
                                    <source src={message.file.data} type={message.file.type} />
                                    Your browser does not support the video tag.
                                </video>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-gray-500 truncate max-w-[80%]">{message.file.name}</span>
                                    <button
                                        onClick={() => downloadFile(message.file.data, message.file.name)}
                                        className="text-xs text-teal-600 hover:text-teal-800"
                                    >
                                        Download
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">
                                    {getFileIcon(message.file.fileType)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{message.file.name}</div>
                                    <div className="text-xs text-gray-500">{formatFileSize(message.file.size)}</div>
                                </div>
                                <button
                                    onClick={() => downloadFile(message.file.data, message.file.name)}
                                    className="flex-shrink-0 text-sm bg-teal-500 hover:bg-teal-600 text-white py-1 px-2 rounded-md"
                                >
                                    Download
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isMe && (
                <div className="w-8 h-8 flex-shrink-0 select-none">
                    {message.picture ? (
                        <img
                            src={message.picture}
                            alt={message.author}
                            className="w-full h-full rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-teal-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {message.author?.charAt(0)?.toUpperCase()}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default MessageItem;