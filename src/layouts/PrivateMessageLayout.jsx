import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import BaseAuthLayout from './BaseAuthLayout';
import useStore from '../hooks/useStore';
import api from '../api';

const nowIso = () => new Date().toISOString();

const PrivateMessageLayout = () => {
  const store = useStore();
  const currentUser = store.user || { id: 'me', username: 'You', name: 'You' };
  const [dmThreads, setDmThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadError, setThreadError] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [newRecipientId, setNewRecipientId] = useState('');
  const [messageText, setMessageText] = useState('');
  const [replyingId, setReplyingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const messagesRef = useRef(null);
  const memberCacheRef = useRef(new Map());

  const normalizeUser = useCallback((user) => {
    if (!user) return { id: null, name: 'Unknown' };
    return {
      ...user,
      name: user.name || user.username || 'Unknown',
    };
  }, []);

  const normalizeMessage = useCallback((message) => {
    if (!message) return null;
    const authorFallbackId =
      message.author_id || message.user_id || message.sender_id || message.from_id;
    const authorFallback =
      authorFallbackId != null ? { id: authorFallbackId } : null;
    return {
      id: message.id,
      author: normalizeUser(
        message.author ||
          message.user ||
          message.sender ||
          message.from ||
          authorFallback
      ),
      content: message.content || message.body || '',
      reply_to: message.reply_to || message.replyTo || null,
      created_at:
        message.created_at || message.createdAt || message.timestamp || nowIso(),
      updated_at: message.updated_at || message.updatedAt || null,
    };
  }, [normalizeUser]);

  const resolveMemberInfo = useCallback(async (memberId) => {
    if (!memberId) return null;
    const cached = memberCacheRef.current.get(memberId);
    if (cached) return cached;

    try {
      const { data } = await api.get(`/users/${memberId}`);
      console.log('DM user lookup', memberId, data);
      toast.info(`DM user lookup ${memberId}: ${JSON.stringify(data)}`);
      const payload = data?.user || data;
      const info = {
        id: memberId,
        name: payload?.username || payload?.name || 'Unknown',
        username: payload?.username,
        avatar: payload?.avatar,
      };
      memberCacheRef.current.set(memberId, info);
      return info;
    } catch (error) {
      console.error(error);
      return null;
    }
  }, []);

  const hydrateThreadUsers = useCallback(async (threads) => {
    const targets = (threads || []).filter(
      (thread) =>
        thread?.user?.id &&
        (!thread.user.username ||
          thread.user.name === 'Unknown' ||
          thread.user.name?.startsWith('DM '))
    );
    if (targets.length === 0) return;

    const results = await Promise.all(
      targets.map((thread) => resolveMemberInfo(thread.user.id))
    );
    const resolved = new Map(
      results.filter(Boolean).map((info) => [info.id, info])
    );
    if (resolved.size === 0) return;

    setDmThreads((prev) =>
      prev.map((thread) => {
        const info = resolved.get(thread.user?.id);
        return info ? { ...thread, user: { ...thread.user, ...info } } : thread;
      })
    );
  }, [currentUser.id, resolveMemberInfo]);

  const hydrateAuthorInfo = useCallback(async (threadId, messages) => {
    const missingIds = new Set(
      (messages || [])
        .map((message) => message?.author)
        .filter(
          (author) =>
            author?.id &&
            String(author.id) !== String(currentUser.id) &&
            (!author?.username && (!author?.name || author.name === 'Unknown'))
        )
        .map((author) => author.id)
    );

    if (missingIds.size === 0) return;

    const results = await Promise.all(
      Array.from(missingIds).map((memberId) => resolveMemberInfo(memberId))
    );
    const resolved = new Map(
      results.filter(Boolean).map((info) => [info.id, info])
    );

    if (resolved.size === 0) return;

    setDmThreads((prev) =>
      prev.map((thread) => {
        if (thread.id !== threadId) return thread;
        const nextMessages = thread.messages.map((message) => {
          const info = resolved.get(message.author?.id);
          if (!info) return message;
          return {
            ...message,
            author: { ...message.author, ...info },
          };
        });
        const threadInfo = resolved.get(thread.user?.id);
        return {
          ...thread,
          messages: nextMessages,
          user: threadInfo ? { ...thread.user, ...threadInfo } : thread.user,
        };
      })
    );
  }, [resolveMemberInfo]);

  const normalizeThread = useCallback((thread) => {
    if (!thread) return null;
    const threadId = thread.id || thread.channel_id || thread.channelId;
    const recipients =
      thread.recipients || thread.users || thread.members || thread.participants || [];
    const fallbackUser =
      thread.user ||
      thread.recipient ||
      (thread.recipient_id || thread.user_id
        ? { id: thread.recipient_id || thread.user_id }
        : {});
    const otherUser =
      recipients.find((recipient) => recipient.id && recipient.id !== currentUser.id) ||
      recipients[0] ||
      fallbackUser ||
      { id: threadId, name: `DM ${threadId || ''}`.trim() };
    const rawMessages =
      thread.messages ||
      thread.direct_messages ||
      thread.directmessage_messages ||
      thread.message_history ||
      [];
    const messages = rawMessages
      .map(normalizeMessage)
      .filter(Boolean);
    return {
      id: threadId,
      user: normalizeUser(otherUser),
      messages,
    };
  }, [currentUser.id, normalizeMessage, normalizeUser]);

  const loadThreads = useCallback(async () => {
    setLoadingThreads(true);
    setThreadError('');
    try {
      const { data } = await api.get('@me/channels');
      const threads = Array.isArray(data) ? data : data?.data || [];
      const normalized = threads.map(normalizeThread).filter(Boolean);
      setDmThreads(normalized);
      setActiveThreadId((prev) => prev || normalized[0]?.id || null);
      hydrateThreadUsers(normalized);
    } catch (error) {
      console.error(error);
      setThreadError('Unable to load direct messages.');
    } finally {
      setLoadingThreads(false);
    }
  }, [hydrateThreadUsers, normalizeThread]);

  const createDmThread = useCallback(async (recipientId) => {
    if (!recipientId) return;
    setThreadError('');
    try {
      const { data } = await api.post('@me/channels', {
        recipients: [recipientId],
      });
      const normalized = normalizeThread(data);
      if (normalized) {
        setDmThreads((prev) => {
          const existing = prev.find((thread) => thread.id === normalized.id);
          return existing ? prev : [normalized, ...prev];
        });
        setActiveThreadId(normalized.id);
      }
      setNewRecipientId('');
    } catch (error) {
      console.error(error);
      setThreadError('Unable to create direct message.');
    }
  }, [normalizeThread]);

  const loadMessages = useCallback(async (threadId) => {
    if (!threadId) return;
    setLoadingMessages(true);
    setMessageError('');
    try {
      const { data } = await api.get(`channels/${threadId}/messages`);
      console.log('DM messages response', threadId, data);
      const messages = (Array.isArray(data) ? data : data?.data || [])
        .map(normalizeMessage)
        .filter(Boolean);
      const authorIds = messages
        .map((message) => message.author?.id)
        .filter(Boolean);
      if (authorIds.length > 0) {
        console.log('DM message author ids', threadId, authorIds);
        const receiverId = authorIds.find((id) => String(id) !== String(currentUser.id));
        if (receiverId) {
          const receiverInfo = await resolveMemberInfo(receiverId);
          if (receiverInfo) {
            setDmThreads((prev) =>
              prev.map((thread) =>
                thread.id === threadId
                  ? { ...thread, user: { ...thread.user, ...receiverInfo } }
                  : thread
              )
            );
          }
        }
      }
      const otherAuthor = messages.find(
        (message) => message.author?.id && message.author.id !== currentUser.id
      )?.author;
      setDmThreads((prev) =>
        prev.map((thread) =>
          thread.id === threadId
            ? { ...thread, messages, user: otherAuthor ? normalizeUser(otherAuthor) : thread.user }
            : thread
        )
      );
      hydrateAuthorInfo(threadId, messages);
    } catch (error) {
      console.error(error);
      setMessageError('Unable to load messages.');
    } finally {
      setLoadingMessages(false);
    }
  }, [currentUser.id, hydrateAuthorInfo, normalizeMessage, normalizeUser, resolveMemberInfo]);

  const activeThread = useMemo(
    () => dmThreads.find((thread) => thread.id === activeThreadId) || null,
    [activeThreadId, dmThreads]
  );

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!activeThreadId) return;
    loadMessages(activeThreadId);
  }, [activeThreadId, loadMessages]);

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [activeThread?.messages?.length, activeThreadId]);

  useEffect(() => {
    if (!activeThreadId || !window.Echo) {
      return;
    }

    const channelName = `directmessage.${activeThreadId}`;

    window.Echo.private(channelName)
      .listen('.directmessage.created', (event) => {
        if (event?.directmessage?.id !== activeThreadId) return;
        const nextMessage = event.message || event.directmessage_message || event.payload?.message;
        if (!nextMessage) return;
        const normalized = normalizeMessage(nextMessage);
        if (!normalized) return;
        setDmThreads((prev) =>
          prev.map((thread) =>
            thread.id === activeThreadId
              ? { ...thread, messages: [...thread.messages, normalized] }
              : thread
          )
        );
      })
      .listen('.directmessage.updated', (event) => {
        if (event?.directmessage?.id !== activeThreadId) return;
        const updatedMessage = event.message || event.directmessage_message || event.payload?.message;
        if (!updatedMessage) return;
        const normalized = normalizeMessage(updatedMessage);
        if (!normalized) return;
        setDmThreads((prev) =>
          prev.map((thread) =>
            thread.id === activeThreadId
              ? {
                  ...thread,
                  messages: thread.messages.map((msg) =>
                    msg.id === normalized.id ? { ...msg, ...normalized } : msg
                  ),
                }
              : thread
          )
        );
      })
      .listen('.directmessage.deleted', (event) => {
        if (event?.directmessage?.id !== activeThreadId) return;
        const deletedId = event.message?.id || event.message_id || event.payload?.message_id;
        if (!deletedId) return;
        setDmThreads((prev) =>
          prev.map((thread) =>
            thread.id === activeThreadId
              ? {
                  ...thread,
                  messages: thread.messages.filter((msg) => msg.id !== deletedId),
                }
              : thread
          )
        );
      });

    return () => {
      window.Echo.leave(channelName);
    };
  }, [activeThreadId, normalizeMessage]);

  const updateThread = (threadId, updater) => {
    setDmThreads((prev) =>
      prev.map((thread) => (thread.id === threadId ? updater(thread) : thread))
    );
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!activeThread || !messageText.trim()) return;
    const content = messageText.trim();
    const replyTo = replyingId;
    setMessageText('');
    setReplyingId(null);
    setMessageError('');
    try {
      const { data } = await api.post(
        `channels/${activeThread.id}/messages?content=${encodeURIComponent(content)}`
      );
      const created = normalizeMessage(data) || {
        id: `msg-${Date.now()}`,
        author: { id: currentUser.id, name: currentUser.username || currentUser.name || 'You' },
        content,
        reply_to: replyTo,
        created_at: nowIso(),
      };
      updateThread(activeThread.id, (thread) => ({
        ...thread,
        messages: [...thread.messages, created],
      }));
    } catch (error) {
      console.error(error);
      setMessageError('Unable to send message.');
      setMessageText(content);
    }
  };

  const startEdit = (message) => {
    setEditingId(message.id);
    setEditText(message.content);
  };

  const saveEdit = (event) => {
    event.preventDefault();
    if (!activeThread || !editingId) return;
    const content = editText.trim();
    if (!content) return;
    updateThread(activeThread.id, (thread) => ({
      ...thread,
      messages: thread.messages.map((msg) =>
        msg.id === editingId ? { ...msg, content, updated_at: nowIso() } : msg
      ),
    }));
    setEditingId(null);
    setEditText('');
  };

  const deleteMessage = (messageId) => {
    if (!activeThread) return;
    updateThread(activeThread.id, (thread) => ({
      ...thread,
      messages: thread.messages.filter((msg) => msg.id !== messageId),
    }));
  };

  const replyPreview = useMemo(() => {
    if (!activeThread || !replyingId) return null;
    return activeThread.messages.find((msg) => msg.id === replyingId) || null;
  }, [activeThread, replyingId]);

  return (
    <BaseAuthLayout>
      <div className="flex h-screen w-screen">
        <aside className="flex w-64 shrink-0 flex-col border-r border-gray-800 bg-gray-900 text-gray-100">
          <div className="px-4 py-4 text-sm font-semibold text-gray-200">Direct Messages</div>
          <div className="px-4 pb-3">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                createDmThread(newRecipientId.trim());
              }}
              className="flex items-center gap-2 rounded bg-gray-800/70 px-2 py-2"
            >
              <input
                value={newRecipientId}
                onChange={(event) => setNewRecipientId(event.target.value)}
                placeholder="Recipient user ID"
                className="w-full bg-transparent text-xs text-gray-100 outline-none placeholder:text-gray-500"
              />
              <button
                type="submit"
                className="rounded bg-gray-700 px-2 py-1 text-[10px] text-gray-200 hover:bg-gray-600"
              >
                New
              </button>
            </form>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {loadingThreads ? (
              <div className="rounded bg-gray-800/60 px-3 py-2 text-xs text-gray-400">
                Loading direct messages...
              </div>
            ) : threadError ? (
              <div className="rounded bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {threadError}
              </div>
            ) : dmThreads.length === 0 ? (
              <div className="rounded bg-gray-800/60 px-3 py-2 text-xs text-gray-400">
                No direct messages yet.
              </div>
            ) : (
              dmThreads.map((thread) => {
                const isActive = thread.id === activeThreadId;
                const name = thread.user?.username || thread.user?.name || 'Unknown';
                const lastMessage = thread.messages[thread.messages.length - 1]?.content;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setActiveThreadId(thread.id)}
                    className={`mb-2 flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition-colors ${
                      isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800/60'
                    }`}
                  >
                    {thread.user?.avatar ? (
                      <img src={thread.user.avatar} alt={name} className="size-9 rounded-full" />
                    ) : (
                      <div className="flex size-9 items-center justify-center rounded-full bg-gray-800 text-xs text-gray-300">
                        {name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-medium text-gray-200">{name}</div>
                      <div className="truncate text-xs text-gray-500">
                        {lastMessage || 'No messages yet'}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-gray-700">
          {activeThread ? (
            <>
              <div className="flex items-center border-b border-gray-800 px-6 py-4">
                <div className="text-sm font-semibold text-gray-100">
                  {activeThread.user?.username || activeThread.user?.name || 'Direct Message'}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 text-sm text-gray-300" ref={messagesRef}>
                {loadingMessages ? (
                  <div className="rounded bg-gray-800/60 px-3 py-2 text-xs text-gray-400">
                    Loading messages...
                  </div>
                ) : messageError ? (
                  <div className="rounded bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    {messageError}
                  </div>
                ) : activeThread.messages.length === 0 ? (
                  <div className="rounded bg-gray-800/60 px-3 py-2 text-xs text-gray-400">
                    No messages yet.
                  </div>
                ) : (
                  activeThread.messages.map((message) => {
                    const isEditing = editingId === message.id;
                    const replyTarget = message.reply_to
                      ? activeThread.messages.find((msg) => msg.id === message.reply_to)
                      : null;
                    return (
                      <div key={message.id} className="group mb-3 rounded p-2 hover:bg-gray-800/60">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="font-semibold text-gray-200">{message.author.name}</span>
                          <span>{new Date(message.created_at).toLocaleTimeString()}</span>
                          {message.updated_at && (
                            <span className="text-[10px] text-gray-500">(edited)</span>
                          )}
                        </div>
                        {replyTarget && (
                          <div className="mt-1 rounded border border-gray-800 bg-gray-900/60 px-2 py-1 text-[11px] text-gray-400">
                            Replying to {replyTarget.author.name}: {replyTarget.content}
                          </div>
                        )}
                        {isEditing ? (
                          <form onSubmit={saveEdit} className="mt-2">
                            <input
                              value={editText}
                              onChange={(event) => setEditText(event.target.value)}
                              className="w-full rounded bg-gray-600 px-3 py-2 text-sm text-white outline-none"
                            />
                          </form>
                        ) : (
                          <div className="mt-1 text-sm text-gray-200">{message.content}</div>
                        )}
                        <div className="mt-2 hidden gap-2 text-[10px] text-gray-400 group-hover:flex">
                          <button
                            type="button"
                            className="rounded border border-gray-700 px-2 py-1 hover:bg-gray-800"
                            onClick={() => setReplyingId(message.id)}
                          >
                            Reply
                          </button>
                          {message.author.id === currentUser.id && (
                            <>
                              <button
                                type="button"
                                className="rounded border border-gray-700 px-2 py-1 hover:bg-gray-800"
                                onClick={() => startEdit(message)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="rounded border border-gray-700 px-2 py-1 hover:bg-gray-800"
                                onClick={() => deleteMessage(message.id)}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="px-6 pb-6">
                {replyPreview && (
                  <div className="mb-2 flex items-center justify-between rounded bg-gray-800 px-3 py-2 text-xs text-gray-300">
                    Replying to {replyPreview.author.name}: {replyPreview.content}
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-200"
                      onClick={() => setReplyingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <form onSubmit={sendMessage} className="flex items-center gap-2 rounded bg-gray-600 px-3 py-2">
                  <input
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-400"
                    placeholder="Message..."
                  />
                  <button
                    type="submit"
                    className="rounded bg-gray-800 px-3 py-1 text-xs text-gray-200 hover:bg-gray-700"
                  >
                    Send
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
              Select a conversation to start messaging.
            </div>
          )}
        </main>
      </div>
    </BaseAuthLayout>
  );
};

export default PrivateMessageLayout;
