import { createContext, useContext, useState, useRef } from 'react';

export const ChannelContext = createContext();

export const ChannelContextProvider = ({ children }) => {
    const [channel, setChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [replyingId, setReplyingId] = useState(null);
    const [pinnedMessages, setPinnedMessages] = useState([]);
    const [pendingMessages, setPendingMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [memberListOpen, setMemberListOpen] = useState(true);
    const inputRef = useRef(null);

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
                inputMessage,
                setInputMessage, 
                memberListOpen,
                setMemberListOpen,
                inputRef,
            }}
        >
            {children}
        </ChannelContext.Provider>
    );
};

export const useChannelContext = () => {
    const channelContext = useContext(ChannelContext);
    if (!channelContext) {
        throw new Error("useChannelContext must be used within a ChannelContextProvider");
    }
    return channelContext;
};
