import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import BaseAuthLayout from './BaseAuthLayout';
import useStore from '../hooks/useStore';
import api from '../api';
import Channel from '../components/Channel';
import { ChannelContextProvider } from '../contexts/ChannelContext';
import UserSettings from '../components/Settings/UserSettings';

const PrivateMessageLayout = () => {
  const store = useStore();
  const currentUser = store.user || { id: 'me', username: 'You', name: 'You' };
  const [dmThreads, setDmThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadError, setThreadError] = useState('');
  const [friendUsername, setFriendUsername] = useState('');
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const memberCacheRef = useRef(new Map());

  const toastResponse = useCallback((label, payload) => {
    let serialized = '';
    try {
      serialized = JSON.stringify(payload);
    } catch {
      serialized = '[unserializable payload]';
    }
    toast.info(`${label}: ${serialized}`);
  }, []);

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
      toast.success(`DM user lookup ${memberId}`);
      toastResponse(`DM user lookup ${memberId}`, data);
      const payload = data?.user || data;
      const info = {
        id: memberId,
        name: payload?.username || payload?.name || 'Unknown',
        username: payload?.username,
        avatar: payload?.avatar,
      };
      memberCacheRef.current.set(memberId, info);
      return info;
    } catch {
      toast.error('Unable to load DM user info.');
      return null;
    }
  }, [toastResponse]);

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
    } catch {
      toast.error('Unable to load direct messages.');
      setThreadError('Unable to load direct messages.');
    } finally {
      setLoadingThreads(false);
    }
  }, [hydrateThreadUsers, normalizeThread]);

  const loadFriendRequests = useCallback(async () => {
    try {
      const { data } = await api.get('@me/friends/requests');
      const requests = Array.isArray(data)
        ? data
        : data?.data || data?.requests || [];
      setFriendRequests(requests);
    } catch {
      toast.error('Unable to load friend requests.');
    }
  }, []);

  const sendFriendRequest = useCallback(async () => {
    const trimmed = friendUsername.trim();
    if (!trimmed) {
      toast.error('Enter a username to send a friend request.');
      return;
    }
    try {
      const { data } = await api.post('@me/friends/requests', null, {
        params: { username: trimmed },
      });
      toastResponse('Friend request sent', data);
      setFriendUsername('');
      loadFriendRequests();
    } catch {
      toast.error('Unable to send friend request.');
    }
  }, [friendUsername, loadFriendRequests, toastResponse]);

  const loadFriends = useCallback(async () => {
    try {
      const { data } = await api.get('@me/friends');
      const list = Array.isArray(data)
        ? data
        : data?.data || data?.friends || [];
      setFriends(list);
    } catch {
      toast.error('Unable to load friends.');
    }
  }, []);

  const acceptFriendRequest = useCallback(async (requestId) => {
    if (!requestId) return;
    try {
      const { data } = await api.post(`@me/friends/requests/${requestId}/accept`);
      toastResponse('Friend request accepted', data);
      loadFriendRequests();
      loadFriends();
    } catch {
      toast.error('Unable to accept friend request.');
    }
  }, [loadFriendRequests, loadFriends, toastResponse]);

  const cancelFriendRequest = useCallback(async (requestId) => {
    if (!requestId) return;
    try {
      const { data } = await api.delete(`@me/friends/requests/${requestId}`);
      toastResponse('Friend request canceled', data);
      loadFriendRequests();
    } catch {
      toast.error('Unable to cancel friend request.');
    }
  }, [loadFriendRequests, toastResponse]);

  const deleteFriend = useCallback(async (friendId) => {
    if (!friendId) return;
    try {
      const { data } = await api.delete(`@me/friends/${friendId}`);
      toastResponse('Friend deleted', data);
      loadFriends();
    } catch {
      toast.error('Unable to delete friend.');
    }
  }, [loadFriends, toastResponse]);

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
    } catch {
      toast.error('Unable to create direct message.');
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
    if (!currentUser || !currentUser.id) return;
    
    window.Echo.private(`user.${currentUser.id}`)
      .listen('.friendrequest.created', (event) => {
        // {"friendRequest":{"sender_id":"1357682785875132416","receiver_id":"1","id":"1357686439940194304","created_at":"2026-01-11T12:01:11.000000Z"}}
        if (event.friendRequest?.receiver_id == currentUser.id) {
          toast.info('You have a new friend request.');
          loadFriendRequests();

          // console.log("Old Friend Requests:", friendRequests);
          // setFriendRequests(friendRequests.concat([event.friendRequest]));
          // console.log("New Friend Requests:", friendRequests);
        }
      })
      .listen('.friendrequest.deleted', (event) => {
        console.log('Received friendrequest.deleted event:', event);

        toast.info('A friend request was canceled or declined.');
        loadFriendRequests();
      })
      .listen('.friendrequest.accepted', (event) => {
        console.log('Received friendrequest.accepted event:', event);

        toast.info('A friend request was accepted.');
        loadFriendRequests();
        loadFriends();
      })
      .listen('.channel.created', (event) => {
        console.log('Received channel.created event:', event);

        toast.info('A new direct message channel was created.');
        loadThreads();
      });

    return () => {
      window.Echo.leave(`user.${currentUser.id}}`);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    loadThreads();
    loadFriends();
    loadFriendRequests();
  }, [loadThreads, loadFriends, loadFriendRequests]);

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
          className={`fixed inset-y-0 left-0 flex h-full w-64 shrink-0 flex-col border-r border-gray-800 bg-gray-800 text-gray-100 transition-transform duration-300 ease-out md:static md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <div className="p-4 text-sm font-semibold text-gray-200">Direct Messages</div>
          <div className="p-4">
            <div className="mb-3 space-y-2">
              <div className="text-[10px] uppercase tracking-wide text-gray-500">
                Add friend
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendFriendRequest();
                }}
                className="flex items-center gap-2 rounded bg-gray-800/70 p-2"
              >
                <input
                  value={friendUsername}
                  onChange={(event) => setFriendUsername(event.target.value)}
                  placeholder="Username"
                  className="w-full bg-transparent text-xs text-gray-100 outline-none placeholder:text-gray-500"
                />
                <button
                  type="submit"
                  className="rounded bg-gray-700 px-2 py-1 text-[10px] text-gray-200 hover:bg-gray-600"
                >
                  Send
                </button>
              </form>
            </div>
            {friendRequests.length > 0 && (
              <div className="mb-4 space-y-2 text-xs text-gray-200">
                <div className="text-[10px] uppercase tracking-wide text-gray-500">
                  Requests
                </div>
                {friendRequests
                  .filter((request) => {
                    const sender = request?.sender || {};
                    const senderId = sender?.id || request?.sender_id || request?.id || request?.request_id || request?.requestId;
                    return senderId !== currentUser.id;
                  })
                  .map((request) => {
                    const requestId =
                      request?.id || request?.request_id || request?.requestId;
                    const sender = request?.sender || {};
                    const senderId = sender?.id || request?.sender_id || requestId;
                    const senderName = sender?.username || sender?.name || 'Unknown';
                    return (
                      <div
                        key={senderId || requestId}
                        className="flex items-center justify-between rounded bg-gray-800/70 p-2"
                      >
                        <span className="truncate">{senderName}</span>
                        <button
                          type="button"
                          onClick={() => acceptFriendRequest(requestId)}
                          className="rounded bg-green-600/80 px-2 py-1 text-[10px] text-white hover:bg-green-500"
                        >
                          Accept
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}

            {friendRequests.length > 0 && (
              <div className="mb-4 space-y-2 text-xs text-gray-200">
                {/* Section header for outgoing requests */}
                <div className="text-[10px] uppercase tracking-wide text-gray-500">
                  Outgoing Requests
                </div>
                {friendRequests
                  .filter((request) => {
                    // Determine sender ID and filter requests sent by the current user
                    const sender = request?.sender || {};
                    const senderId = sender?.id || request?.sender_id || request?.id || request?.request_id || request?.requestId;
                    return senderId === currentUser.id;
                  })
                  .map((request) => {
                    // Extract request and recipient details
                    const requestId = request?.id || request?.request_id || request?.requestId;
                    const recipient = request?.recipient || {};
                    const recipientName = recipient?.username || recipient?.name || request?.username || request?.name || 'Unknown';
                    return (
                      <div
                        key={requestId}
                        className="flex items-center justify-between rounded bg-gray-800/70 p-2"
                      >
                        <span className="truncate">{recipientName}</span>
                        {/* Cancel button for outgoing requests */}
                        <button
                          type="button"
                          onClick={() => cancelFriendRequest(requestId)}
                          className="rounded bg-red-600/80 px-2 py-1 text-[10px] text-white hover:bg-red-500"
                        >
                          Cancel
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}

            {friends.length > 0 && (
              <div className="space-y-2 text-xs text-gray-200">
                <div className="text-[10px] uppercase tracking-wide text-gray-500">
                  Friends
                </div>
                {friends.map((friend) => {
                  const friendId =
                    friend?.id || friend?.user_id || friend?.userId || friend?.user?.id;
                  const friendName =
                    friend?.username ||
                    friend?.name ||
                    friend?.user?.username ||
                    friend?.user?.name ||
                    'Unknown';
                  return (
                    <div
                      key={friendId || friendName}
                      className="flex items-center justify-between rounded bg-gray-800/70 p-2"
                    >
                      <span className="truncate text-gray-200">{friendName}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            createDmThread(friendId);
                            setIsSidebarOpen(false);
                          }}
                          className="rounded bg-blue-600/80 px-2 py-1 text-[10px] text-white hover:bg-blue-500"
                        >
                          Message
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteFriend(friendId)}
                          className="rounded bg-red-600/80 px-2 py-1 text-[10px] text-white hover:bg-red-500"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                    className={`mb-2 flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition-colors ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800/60'
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
        </aside>
        {!isSidebarOpen && (
          <button
            type="button"
            className="fixed left-0 top-1/2 z-30 h-24 w-4 -translate-y-1/2 rounded-r border border-gray-600/60 bg-gray-800/70 shadow-sm transition-all duration-300 animate-pulse hover:w-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open sidebar"
          />
        )}
        <main className="relative flex min-w-0 flex-1 flex-col bg-gray-700">
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
      <UserSettings isOpen={isUserSettingsOpen} onClose={() => setIsUserSettingsOpen(false)} />
    </BaseAuthLayout>
  );
};

export default PrivateMessageLayout;
