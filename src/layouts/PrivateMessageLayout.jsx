import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import BaseAuthLayout from './BaseAuthLayout';
import useStore from '../hooks/useStore';
import api from '../api';
import Channel from '../components/Channel';
import { ChannelContextProvider } from '../contexts/ChannelContext';
import UserBar from '../components/UserBar';

const PrivateMessageLayout = () => {
  const store = useStore();
  const currentUser = store.user || { id: 'me', username: 'You', name: 'You' };
  const [dmThreads, setDmThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadError, setThreadError] = useState('');
  const [newRecipientId, setNewRecipientId] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const memberCacheRef = useRef(new Map());

  const normalizeUser = useCallback((user) => {
    if (!user) return { id: null, name: 'Unknown' };
    return {
      ...user,
      name: user.name || user.username || 'Unknown',
    };
  }, []);

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
        (thread?.recipientId || thread?.user?.id) &&
        (!thread.user.username ||
          thread.user.name === 'Unknown' ||
          thread.user.name?.startsWith('DM '))
    );
    if (targets.length === 0) return;

    const results = await Promise.all(
      targets.map((thread) => resolveMemberInfo(thread.recipientId || thread.user.id))
    );
    const resolved = new Map(
      results.filter(Boolean).map((info) => [info.id, info])
    );
    if (resolved.size === 0) return;

    setDmThreads((prev) =>
      prev.map((thread) => {
        const info = resolved.get(thread.recipientId || thread.user?.id);
        return info ? { ...thread, user: { ...thread.user, ...info } } : thread;
      })
    );
  }, [resolveMemberInfo]);

  const normalizeThread = useCallback((thread) => {
    if (!thread) return null;
    const threadId = thread.id || thread.channel_id || thread.channelId;
    const recipientId =
      thread.recipient_id ||
      thread.recipient?.id ||
      thread.user_id ||
      thread.user?.id ||
      null;
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
    return {
      id: threadId,
      channel_id: thread.channel_id || thread.channelId || threadId,
      recipientId,
      user: normalizeUser(otherUser),
    };
  }, [currentUser.id, normalizeUser]);

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

  const activeThread = useMemo(
    () => dmThreads.find((thread) => thread.id === activeThreadId) || null,
    [activeThreadId, dmThreads]
  );

  const activeChannel = useMemo(() => {
    if (!activeThread) return null;
    const name = activeThread.user?.username || activeThread.user?.name || 'Direct Message';
    return {
      ...activeThread,
      channel_id: activeThread.channel_id || activeThread.id,
      name,
    };
  }, [activeThread]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  return (
    <BaseAuthLayout>
      <div className="flex h-screen w-screen">
        {isSidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-transparent md:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
          />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex h-full w-64 shrink-0 flex-col border-r border-gray-800 bg-gray-900 text-gray-100 transition-transform md:static md:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
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
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => {
                      setActiveThreadId(thread.channel_id || thread.id);
                      setIsSidebarOpen(false);
                    }}
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
                        Open to view messages
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="shrink-0">
            <UserBar />
          </div>
        </aside>

        <main className="relative flex min-w-0 flex-1 flex-col bg-gray-700 pt-10 md:pt-0">
          <button
            type="button"
            className="absolute left-3 top-2 z-20 flex items-center gap-1 rounded-full border border-gray-600/60 bg-gray-800/70 px-3 py-1 text-xs font-semibold text-gray-100 shadow-sm md:hidden"
            onClick={() => setIsSidebarOpen(true)}
          >
            Menu
            <span aria-hidden="true">›</span>
          </button>
          {activeChannel ? (
            <ChannelContextProvider>
              <Channel channel={activeChannel} />
            </ChannelContextProvider>
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
