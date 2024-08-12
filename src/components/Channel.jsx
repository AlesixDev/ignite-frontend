import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-toastify';
import { Gif, Gift, PlusCircle, Smiley, Sticker, NotePencil, Trash, ArrowBendUpLeft, XCircle } from '@phosphor-icons/react';
import api from '../api';
import useStore from '../hooks/useStore';
import { create } from 'zustand';
import ChannelBar from './ChannelBar.jsx';

const useChannelStore = create((set) => ({
  channel: null,
  setChannel: (channel) => set({ channel }),
  messages: [],
  setMessages: (messages) => set({ messages }),
  editingId: null,
  setEditingId: (editingId) => set({ editingId }),
  replyingId: null,
  setReplyingId: (replyingId) => set({ replyingId }),
}));

const ChannelMessage = ({ message, prevMessage }) => {
  const store = useStore();

  const { messages, setMessages, editingId, setEditingId, setReplyingId } = useChannelStore();

  const formattedDateTime = useMemo(() => {
    const date = new Date(message.created_at);

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const day = isToday ? 'Today' : isYesterday ? 'Yesterday' : date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    return `${day} at ${time}`;
  }, [message.created_at]);

  // Stack messages from the same author within 1 minute.
  const shouldStack = useMemo(() => {
    if (prevMessage) {
      const sameAuthor = prevMessage.author.id === message.author.id;
      const sentWithinMinute = (new Date(message.created_at) - new Date(prevMessage.created_at)) / 1000 < 60;

      return sameAuthor && sentWithinMinute;
    }
  }, [prevMessage, message]);

  const isEditing = useMemo(() => editingId === message.id, [editingId, message.id]);
  const canEdit = useMemo(() => message.author.id === store.user.id, [message.author.id, store.user.id]);
  const canDelete = useMemo(() => message.author.id === store.user.id, [message.author.id, store.user.id]);

  const [editedMessage, setEditedMessage] = useState(message.content);

  const onEdit = useCallback(async (event) => {
    event.preventDefault();

    if (!editedMessage || editedMessage === message.content) {
      setEditingId(null);
      return;
    }

    try {
      await api.put(`/channels/${message.channel_id}/messages/${message.id}`, { content: editedMessage });
      setMessages(messages.map((m) => m.id === message.id ? { ...m, content: editedMessage, updated_at: new Date().toISOString() } : m));
      setEditingId(null);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Could not edit message.');
    }
  }, [message.channel_id, message.id, editedMessage, setMessages, messages, setEditingId]);

  const onDelete = useCallback(async () => {
    try {
      await api.delete(`/channels/${message.channel_id}/messages/${message.id}`);
      setMessages(messages.filter((m) => m.id !== message.id));
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Could not delete message.');
    }
  }, [message.channel_id, message.id, messages, setMessages]);

  const onReply = useCallback(() => {
    setReplyingId(message.id);
  }, [message.id, setReplyingId]);

  return (
    <div className={`group relative py-0.5 ${isEditing ? 'bg-gray-800/60' : 'hover:bg-gray-800/60'} ${shouldStack ? '' : 'mt-3.5'}`}>
      <div className="flex px-4">
        {shouldStack ? (
          <div className="w-14" />
        ) : (
          <>
            {message?.author.avatar ? (
              <img
                className="h-10 rounded-full bg-transparent"
                src={message?.author.avatar}
                alt="User avatar"
              />
            ) : (
              <div className="mr-4 flex size-10 items-center justify-center rounded-full bg-gray-800 text-gray-300">
                {message?.author.username.slice(0, 1).toUpperCase()}
              </div>
            )}
          </>
        )}

        <div className="flex flex-1 flex-col items-start justify-start">
          {shouldStack ? null : (
            <div className="mb-1 flex justify-start leading-none">
              <h6 className="font-semibold leading-none">
                {message?.author.username}
              </h6>
              <p className="ml-2 self-end text-xs font-medium leading-tight text-gray-600 dark:text-gray-500">
                {formattedDateTime}
              </p>
            </div>
          )}

          {isEditing ? (
            <div className="my-2 w-full">
              <div className="mb-1 flex items-center rounded-lg bg-gray-600 px-4 py-2">
                <form onSubmit={(e) => onEdit(e)} className="w-full">
                  <input
                    className="w-full border-0 bg-inherit p-0 text-white outline-none placeholder:text-gray-400 focus:ring-0"
                    type="text"
                    value={editedMessage}
                    onChange={(e) => setEditedMessage(e.target.value)}
                    autoFocus
                  />
                </form>
              </div>
              <p className="text-xs text-gray-400">
                escape to <button onClick={() => setEditingId(null)} className="text-primary">cancel</button>,
                enter to <button onClick={(e) => onEdit(e)} className="text-primary">save</button>
              </p>
            </div>
          ) : (
            <div className="text-gray-400">
              {message.content}
              {(message.updated_at && message.created_at !== message.updated_at) && (
                <span className="ml-1 text-[0.65rem] text-gray-500">(edited)</span>
              )}
            </div>
          )}
        </div>
      </div>
      {!isEditing && (
        <div className="absolute -top-4 right-4 hidden rounded-md border border-gray-800 bg-gray-700 group-hover:flex">
          {canEdit && (
            <button type="button" onClick={() => setEditingId(message.id)} className="rounded-md p-2 text-sm text-white/90 hover:bg-primary/10 hover:text-primary">
              <NotePencil className="size-5" />
            </button>
          )}
          {canDelete && (
            <button type="button" onClick={onDelete} className="rounded-md p-2 text-sm text-white/90 hover:bg-primary/10 hover:text-primary">
              <Trash className="size-5" />
            </button>
          )}
          <button type="button" onClick={onReply} className="rounded-md p-2 text-sm text-white/90 hover:bg-primary/10 hover:text-primary">
            <ArrowBendUpLeft className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
};

const ChannelMessages = ({ messagesRef }) => {
  const { messages, setEditingId, replyingId, setReplyingId } = useChannelStore();

  // attach escape key listener to cancel editing
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setEditingId(null);
        setReplyingId(null);
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [setEditingId, setReplyingId]);

  console.log('effect', messages, 'is array', Array.isArray(messages));

  return (
    <div className={`h-full overflow-y-auto ${replyingId ? ' max-h-[calc(100vh-11.5rem)]' : ' max-h-[calc(100vh-9rem)]'}`} ref={messagesRef}>
      {messages && messages.map((message, index) => {
        const prevMessage = messages[index - 1] || null;

        return (
          <ChannelMessage key={message.id} message={message} prevMessage={prevMessage} />
        );
      })}
    </div>
  );
};

const ChannelInput = ({ channel, scrollToBottom }) => {
  const { messages, replyingId, setReplyingId } = useChannelStore();

  const replyMessage = useMemo(() => replyingId ? messages.find((m) => m.id == replyingId) : null, [messages, replyingId]);

  const [message, setMessage] = useState('');

  const inputRef = useRef();

  const sendMessage = useCallback(async (event) => {
    event.preventDefault();

    if (!channel?.channel_id || !message) {
      return;
    }

    try {
      await api.post(`/channels/${channel.channel_id}/messages`, { content: message, reply_to: replyingId });
      setMessage('');
      setReplyingId(null);
      scrollToBottom();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Could not send message.');
    }
  }, [channel.channel_id, message, replyingId, scrollToBottom, setReplyingId]);

  // autofocus when replying
  useEffect(() => {
    if (replyingId) {
      inputRef.current.focus();
    }
  }, [replyingId]);

  return (
    <div className="mx-4 my-6">
      {replyingId && (
        <div className="flex items-center justify-between gap-2 rounded-t-lg bg-gray-800 px-4 py-2 text-sm text-gray-300">
          <p>Replying to <span className="text-primary">{replyMessage?.author.username}</span></p>
          <button type="button" onClick={() => setReplyingId(null)} className="text-gray-400 hover:text-gray-200">
            <XCircle weight="fill" className="size-5" />
          </button>
        </div>
      )}
      <div className={`flex items-center bg-gray-600 py-2 ${replyingId ? 'rounded-b-lg' : 'rounded-lg'}`}>
        <div>
          <PlusCircle
            className="mx-4 cursor-pointer text-gray-400 hover:text-gray-200"
            weight="fill"
            size={26}
          />
        </div>

        <form onSubmit={(e) => sendMessage(e)} className="w-full">
          <input
            className="w-full border-0 bg-inherit p-0 text-white outline-none placeholder:text-gray-400 focus:ring-0"
            type="text"
            placeholder={`Message #${channel?.name}`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            ref={inputRef}
          />
        </form>

        <div className="mr-1 flex">
          <Gift
            className="mx-1.5 cursor-pointer text-gray-400 hover:text-gray-200"
            weight="fill"
            size={28}
          />
          <Gif
            className="mx-1.5 cursor-pointer text-gray-400 hover:text-gray-200"
            weight="fill"
            size={28}
          />
          <Sticker
            className="mx-1.5 cursor-pointer text-gray-400 hover:text-gray-200"
            weight="fill"
            size={28}
          />
          <Smiley
            className="mx-1.5 cursor-pointer text-gray-400 hover:text-gray-200"
            weight="fill"
            size={28}
          />
        </div>
      </div>
    </div>
  );
};

const Channel = ({ channel }) => {
  const { messages, setMessages } = useChannelStore();

  const [firstLoad, setFirstLoad] = useState(true);

  const messagesRef = useRef();

  const scrollToBottom = useCallback(() => {
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messagesRef]);

  const fetchMessages = useCallback(async () => {
    if (!channel?.channel_id) {
      return;
    }

    try {
      const response = await api.get(`/channels/${channel.channel_id}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Could not fetch messages.');
    }
  }, [channel.channel_id, setMessages]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages, firstLoad, scrollToBottom]);

  useEffect(() => {
    if (messages && messages.length && firstLoad) {
      scrollToBottom();
      setFirstLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    setFirstLoad(true);
  }, [channel]);

  useEffect(() => {
    if (!channel) {
      return;
    }

    window.Echo.private(`channel.${channel.channel_id}`)
      .listen('.message.created', (event) => {
        if (event.channel.id == channel.channel_id) {
          setMessages([...messages, event.message]);
        }
      })

    return () => {
      window.Echo.leave(`channel.${channel.channel_id}`);
    };
  }, [channel, messages, scrollToBottom, setMessages]);

  return (
    <div className="relative flex w-full flex-col dark:bg-gray-700">
      <ChannelBar channel={channel} />
      <hr className="m-0 w-full border border-gray-800 bg-gray-800 p-0" />
      <ChannelMessages messagesRef={messagesRef} />
      <ChannelInput channel={channel} fetchMessages={fetchMessages} scrollToBottom={scrollToBottom} />
    </div>
  );
};

export default Channel;
