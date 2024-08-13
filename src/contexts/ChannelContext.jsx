import React, { createContext, useContext, useState } from 'react';

// Create the ChannelContext
export const ChannelContext = createContext();

// Create the ChannelContextProvider component
export const ChannelContextProvider = ({ children }) => {
    const [channel, setChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [replyingId, setReplyingId] = useState(null);
    const [pinnedMessages, setPinnedMessages] = useState([]);
    const [pendingMessages, setPendingMessages] = useState([]);

    // channel: null,
    // setChannel: (channel) => set({ channel }),
    // messages: [],
    // setMessages: (messages) => set({ messages }),
    // pendingMessages: [],
    // setPendingMessages: (pendingMessages) => set({ pendingMessages }),
    // editingId: null,
    // setEditingId: (editingId) => set({ editingId }),
    // replyingId: null,
    // setReplyingId: (replyingId) => set({ replyingId }),

    return (
        <ChannelContext.Provider
            value={{
                channel,
                setChannel,
                messages,
                setMessages,
                editingId,
                setEditingId,
                replyingId,
                setReplyingId,
                pinnedMessages,
                setPinnedMessages,
                pendingMessages,
                setPendingMessages,
                // Add any other values or functions you want to expose
            }}
        >
            {children}
        </ChannelContext.Provider>
    );
};

// Create the useChannelContext hook
export const useChannelContext = () => {
    const channelContext = useContext(ChannelContext);
    if (!channelContext) {
        throw new Error("useChannelContext must be used within a ChannelContextProvider");
    }
    return channelContext;
};