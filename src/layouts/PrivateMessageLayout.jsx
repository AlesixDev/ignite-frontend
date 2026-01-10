import { useEffect, useMemo, useRef, useState } from 'react';
import BaseAuthLayout from './BaseAuthLayout';
import useStore from '../hooks/useStore';

const nowIso = () => new Date().toISOString();

const PrivateMessageLayout = () => {
  const store = useStore();
  const currentUser = store.user || { id: 'me', username: 'You', name: 'You' };
  const [dmThreads, setDmThreads] = useState(() => [
    {
      id: 'dm-1',
      user: { id: 'user-1', username: 'Aria', name: 'Aria' },
      messages: [
        {
          id: 'msg-1',
          author: { id: 'user-1', name: 'Aria' },
          content: 'Test DM',
          created_at: nowIso(),
        },
      ],
    },
    {
      id: 'dm-2',
      user: { id: 'user-2', username: 'Nova', name: 'Nova' },
      messages: [
        {
          id: 'msg-3',
          author: { id: 'user-2', name: 'Nova' },
          content: 'Test DM.',
          created_at: nowIso(),
        },
      ],
    },
  ]);
  const [activeThreadId, setActiveThreadId] = useState('dm-1');
  const [messageText, setMessageText] = useState('');
  const [replyingId, setReplyingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const messagesRef = useRef(null);

  const activeThread = useMemo(
    () => dmThreads.find((thread) => thread.id === activeThreadId) || null,
    [activeThreadId, dmThreads]
  );

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
        setDmThreads((prev) =>
          prev.map((thread) =>
            thread.id === activeThreadId
              ? { ...thread, messages: [...thread.messages, nextMessage] }
              : thread
          )
        );
      })
      .listen('.directmessage.updated', (event) => {
        if (event?.directmessage?.id !== activeThreadId) return;
        const updatedMessage = event.message || event.directmessage_message || event.payload?.message;
        if (!updatedMessage) return;
        setDmThreads((prev) =>
          prev.map((thread) =>
            thread.id === activeThreadId
              ? {
                  ...thread,
                  messages: thread.messages.map((msg) =>
                    msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
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
  }, [activeThreadId]);

  const updateThread = (threadId, updater) => {
    setDmThreads((prev) =>
      prev.map((thread) => (thread.id === threadId ? updater(thread) : thread))
    );
  };

  const sendMessage = (event) => {
    event.preventDefault();
    if (!activeThread || !messageText.trim()) return;
    const content = messageText.trim();
    const replyTo = replyingId;
    const newMessage = {
      id: `msg-${Date.now()}`,
      author: { id: currentUser.id, name: currentUser.username || currentUser.name || 'You' },
      content,
      reply_to: replyTo,
      created_at: nowIso(),
    };
    updateThread(activeThread.id, (thread) => ({
      ...thread,
      messages: [...thread.messages, newMessage],
    }));
    setMessageText('');
    setReplyingId(null);
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
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {dmThreads.length === 0 ? (
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
                {activeThread.messages.map((message) => {
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
                })}
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
