import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-toastify';
import { Gif, Gift, PlusCircle, Smiley, Sticker, NotePencil, Trash, ArrowBendUpLeft, XCircle } from '@phosphor-icons/react';
import api from '../api';
import useStore from '../hooks/useStore';
import { create } from 'zustand';
import ChannelBar from './ChannelBar.jsx';
import { useChannelContext } from '../contexts/ChannelContext.jsx';

const useChannelStore = create((set) => ({
  channel: null,
  setChannel: (channel) => set({ channel }),
  messages: [],
  setMessages: (messages) => set({ messages }),
  pendingMessages: [],
  setPendingMessages: (pendingMessages) => set({ pendingMessages }),
  editingId: null,
  setEditingId: (editingId) => set({ editingId }),
  replyingId: null,
  setReplyingId: (replyingId) => set({ replyingId }),
}));

const ChannelMessage = ({ message, prevMessage, pending }) => {
  const store = useStore();

  const { messages, setMessages, editingId, setEditingId, setReplyingId } = useChannelContext();

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

  const shouldStack = useMemo(() => {
    if (prevMessage) {
      const sameAuthor = prevMessage.author.id === message.author.id;
      const sameName = prevMessage.author.name === message.author.name;
      const sentWithinMinute = (new Date(message.created_at) - new Date(prevMessage.created_at)) / 1000 < 60;

      return sameAuthor && sameName && sentWithinMinute;
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
  }, [editedMessage, message.content, message.channel_id, message.id, setEditingId, setMessages, messages]);

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
              <img className="h-10 rounded-full bg-transparent" src={message?.author.avatar} alt="User avatar" />
            ) : (
              <div className="mr-4 flex size-10 items-center justify-center rounded-full bg-gray-800 text-gray-300">
                {message?.author?.name?.slice(0, 1).toUpperCase()}
              </div>
            )}
          </>
        )}

        <div className="flex flex-1 flex-col items-start justify-start">
          {shouldStack ? null : (
            <div className="mb-1 flex justify-start leading-none">
              <h6 className="font-semibold leading-none">
                {message?.author.name} {message?.author.is_webhook ? ' APP' : ''}
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
                escape to <button onClick={() => setEditingId(null)} className="text-primary hover:underline">cancel</button> •
                enter to <button onClick={(e) => onEdit(e)} className="text-primary hover:underline">save</button>
              </p>
            </div>
          ) : (
            <div className={`text-gray-400 ${pending ? 'opacity-50' : ''}`}>
              {message.content}
              {(message.updated_at && message.created_at !== message.updated_at) && (
                <span className="ml-1 text-[0.65rem] text-gray-500">(edited)</span>
              )}
            </div>
          )}
        </div>
      </div>
      {(!isEditing && !pending) && (
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

const ChannelMessages = ({ messagesRef, highlightId, onLoadMore, loadingMore, hasMore }) => {
  const { messages, pendingMessages, setEditingId, replyingId, setReplyingId } = useChannelContext();
  const [atTop, setAtTop] = useState(false);

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

  const onScroll = useCallback(() => {
    const el = messagesRef.current;
    if (!el) return;
    setAtTop(el.scrollTop <= 10);
  }, [messagesRef]);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    setAtTop(el.scrollTop <= 10);
  }, [messagesRef, messages?.length]);

  return (
    <div
      className={`h-full overflow-y-auto ${replyingId ? ' max-h-[calc(100vh-11.5rem)]' : ' max-h-[calc(100vh-9rem)]'}`}
      ref={messagesRef}
      onScroll={onScroll}
    >
      {atTop && hasMore && (
        <div className="sticky top-0 z-10 flex justify-center bg-gray-700/80 backdrop-blur px-4 py-2">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="rounded bg-gray-800 px-3 py-1 text-xs text-gray-200 hover:bg-gray-750 disabled:opacity-60"
          >
            {loadingMore ? 'Loading…' : 'Load history'}
          </button>
        </div>
      )}

      {!hasMore && (
        <div className="px-4 py-2 text-center text-xs text-gray-500">
          Beginning of channel
        </div>
      )}

      {messages && messages.map((message, index) => {
        const prevMessage = messages[index - 1] || null;
        return (
          <div key={message.id} id={`msg-${message.id}`} className={highlightId === message.id ? 'ring-2 ring-primary rounded' : ''}>
            <ChannelMessage message={message} prevMessage={prevMessage} />
          </div>
        );
      })}
      {pendingMessages && pendingMessages.map((message, index) => {
        const prevMessage = pendingMessages[index - 1] || messages[messages.length - 1] || null;
        return (
          <ChannelMessage key={message.nonce} message={message} prevMessage={prevMessage} pending={true} />
        );
      })}
    </div>
  );
};

const ChannelInput = ({ channel }) => {
  const { messages, setMessages, pendingMessages, setPendingMessages, replyingId, setReplyingId } = useChannelContext();

  const replyMessage = useMemo(() => replyingId ? messages.find((m) => m.id == replyingId) : null, [messages, replyingId]);

  const [message, setMessage] = useState('');

  const inputRef = useRef();

  const sendMessage = useCallback(async (event) => {
    event.preventDefault();

    if (!channel?.channel_id || !message) {
      return;
    }

    try {
      const generatedNonce = Date.now().toString() + Math.floor(Math.random() * 1000).toString();

      setPendingMessages([...pendingMessages, {
        nonce: generatedNonce,
        content: message,
        author: {
          id: useStore.getState().user.id,
          name: useStore.getState().user.name ?? useStore.getState().user.username,
          username: useStore.getState().user.username,
        },
        created_at: new Date().toISOString(),
      }]);

      api.post(`/channels/${channel.channel_id}/messages`, {
        content: message,
        nonce: generatedNonce,
        reply_to: replyingId
      }).then((response) => {
        setPendingMessages((pendingMessages) => pendingMessages.filter((m) => m.nonce !== generatedNonce));
        setMessages((messages) => [...messages, response.data]);
      });

      setMessage('');
      setReplyingId(null);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Could not send message.');
    }
  }, [channel?.channel_id, message, pendingMessages, replyingId, setPendingMessages, setReplyingId]);

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
        <div className="mr-1"></div>

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

        <div className="mr-1 flex"></div>
      </div>
    </div>
  );
};

const Channel = ({ channel }) => {
  const { messages, setMessages, pendingMessages, setPendingMessages } = useChannelContext();
  const [forceScrollDown, setForceScrollDown] = useState(false);
  const [highlightId, setHighlightId] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const messagesRef = useRef();

  const fetchMessages = useCallback(async (opts = {}) => {
    if (!channel?.channel_id) return;

    const limit = opts.limit ?? 50;
    const before = opts.before;

    const params = { limit };
    if (before) params.before = before;

    return api.get(`/channels/${channel.channel_id}/messages`, { params }).then((response) => {
      const data = Array.isArray(response.data) ? response.data : [];
      return data;
    }).catch((error) => {
      console.error(error);
      toast.error(error.response?.data?.message || 'Could not fetch messages.');
      return [];
    });
  }, [channel?.channel_id]);

  useEffect(() => {
    setMessages([]);
    setPendingMessages([]);
    setHasMore(true);

    fetchMessages({ limit: 50 }).then((data) => {
      setMessages(data);
      setTimeout(() => setForceScrollDown(true), 0);
    });
  }, [fetchMessages, setMessages, setPendingMessages]);

  useEffect(() => {
    if (forceScrollDown || (messagesRef.current.scrollHeight - messagesRef.current.scrollTop - messagesRef.current.clientHeight < 100)) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [pendingMessages, messages, forceScrollDown]);

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
      .listen('.message.updated', (event) => {
        if (event.channel.id == channel.channel_id) {
          setMessages(messages.map((m) => m.id === event.message.id ? { ...m, content: event.message.content, updated_at: event.message.updated_at } : m));
        }
      })
      .listen('.message.deleted', (event) => {
        if (event.channel.id == channel.channel_id) {
          setMessages(messages.filter((m) => m.id !== event.message.id));
        }
      });

    return () => {
      window.Echo.leave(`channel.${channel.channel_id}`);
    };
  }, [channel, messages, pendingMessages, setMessages, setPendingMessages]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    if (!messagesRef.current) return;
    if (!messages || messages.length === 0) return;

    const oldestId = messages[0]?.id;
    if (!oldestId) return;

    setLoadingMore(true);

    const container = messagesRef.current;
    const prevScrollHeight = container.scrollHeight;

    const older = await fetchMessages({ limit: 50, before: oldestId });

    if (!older || older.length === 0) {
      setHasMore(false);
      setLoadingMore(false);
      return;
    }

    const existing = new Set(messages.map((m) => String(m.id)));
    const dedupedOlder = older.filter((m) => !existing.has(String(m.id)));

    setMessages((prev) => [...dedupedOlder, ...prev]);

    requestAnimationFrame(() => {
      const newScrollHeight = container.scrollHeight;
      container.scrollTop = newScrollHeight - prevScrollHeight + container.scrollTop;
      setLoadingMore(false);
    });
  }, [fetchMessages, hasMore, loadingMore, messages, setMessages]);

  const handleJumpToMessage = (msgId) => {
    setHighlightId(msgId);
    setTimeout(() => setHighlightId(null), 2000);
    setTimeout(() => {
      const el = document.getElementById(`msg-${msgId}`);
      if (el && messagesRef.current) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  return (
    <div className="relative flex w-full flex-col dark:bg-gray-700">
      <ChannelBar channel={channel} onJumpToMessage={handleJumpToMessage} />
      <hr className="m-0 w-full border border-gray-800 bg-gray-800 p-0" />
      <ChannelMessages
        messagesRef={messagesRef}
        highlightId={highlightId}
        onLoadMore={loadMore}
        loadingMore={loadingMore}
        hasMore={hasMore}
      />
      <ChannelInput channel={channel} fetchMessages={fetchMessages} />
    </div>
  );
};

export default Channel;
