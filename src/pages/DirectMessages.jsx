import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { UserPlus, MessageSquare, UserCheck, UserMinus, Users } from 'lucide-react'; // Optional: for icons
import BaseAuthLayout from '../layouts/BaseAuthLayout';
import useStore from '../hooks/useStore';
import api from '../api';
import Channel from '../components/Channel';
import { ChannelContextProvider } from '../contexts/ChannelContext';
import UserSettings from '../components/Settings/UserSettings';
import { GuildContextProvider } from '../contexts/GuildContext';
import Avatar from '../components/Avatar';

const DirectMessagesPage = () => {
  const store = useStore();
  const currentUser = store.user || { id: 'me', username: 'You', name: 'You' };

  // Navigation State
  const [activeThreadId, setActiveThreadId] = useState('friends'); // 'friends' or channel ID
  const [activeTab, setActiveTab] = useState('online'); // online, all, pending, add_friend

  // Data State
  const [dmThreads, setDmThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadError, setThreadError] = useState('');
  const [friendUsername, setFriendUsername] = useState('');
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const memberCacheRef = useRef(new Map());

  // ... (Keep your existing useCallback functions: toastResponse, normalizeUser, resolveMemberInfo, hydrateThreadUsers, normalizeThread)
  // [Omitted for brevity, but keep them in your code]
  const toastResponse = useCallback((label, payload) => {
    let serialized = '';
    try { serialized = JSON.stringify(payload); } catch { serialized = '[unserializable]'; }
    toast.info(`${label}: ${serialized}`);
  }, []);

  const normalizeUser = useCallback((user) => {
    if (!user) return { id: null, name: 'Unknown' };
    return { ...user, name: user.name || user.username || 'Unknown' };
  }, []);

  const resolveMemberInfo = useCallback(async (memberId) => {
    if (!memberId) return null;
    const cached = memberCacheRef.current.get(memberId);
    if (cached) return cached;
    try {
      const { data } = await api.get(`/users/${memberId}`);
      const payload = data?.user || data;
      const info = { id: memberId, name: payload?.username || 'Unknown', avatar: payload?.avatar };
      memberCacheRef.current.set(memberId, info);
      return info;
    } catch { return null; }
  }, []);

  const hydrateThreadUsers = useCallback(async (threads) => {
    const targets = (threads || []).filter(t => t.user.name === 'Unknown' || t.user.name?.startsWith('DM '));
    if (targets.length === 0) return;
    const results = await Promise.all(targets.map((t) => resolveMemberInfo(t.recipientId || t.user.id)));
    const resolved = new Map(results.filter(Boolean).map((i) => [i.id, i]));
    setDmThreads((prev) => prev.map((t) => {
      const info = resolved.get(t.recipientId || t.user?.id);
      return info ? { ...t, user: { ...t.user, ...info } } : t;
    }));
  }, [resolveMemberInfo]);

  const normalizeThread = useCallback((thread) => {
    if (!thread) return null;
    const id = thread.id || thread.channel_id || thread.channelId;
    const otherUser = (thread.recipients || []).find(r => r.id !== currentUser.id) || thread.user || {};
    return { id, channel_id: id, user: normalizeUser(otherUser) };
  }, [currentUser.id, normalizeUser]);

  const loadThreads = useCallback(async () => {
    setLoadingThreads(true);
    try {
      const { data } = await api.get('@me/channels');
      const normalized = (Array.isArray(data) ? data : data?.data || []).map(normalizeThread).filter(Boolean);
      setDmThreads(normalized);
      hydrateThreadUsers(normalized);
    } catch { toast.error('Failed to load DMs'); }
    finally { setLoadingThreads(false); }
  }, [hydrateThreadUsers, normalizeThread]);

  const loadFriendRequests = useCallback(async () => {
    try {
      const { data } = await api.get('@me/friends/requests');
      setFriendRequests(Array.isArray(data) ? data : data?.data || []);
    } catch { toast.error('Failed to load requests'); }
  }, []);

  const loadFriends = useCallback(async () => {
    try {
      const { data } = await api.get('@me/friends');
      setFriends(Array.isArray(data) ? data : data?.data || []);
    } catch { toast.error('Failed to load friends'); }
  }, []);

  const createDmThread = useCallback(async (recipientId) => {
    try {
      const { data } = await api.post('@me/channels', { recipients: [recipientId] });
      const normalized = normalizeThread(data);
      if (normalized) {
        setDmThreads(prev => prev.find(t => t.id === normalized.id) ? prev : [normalized, ...prev]);
        setActiveThreadId(normalized.id);
      }
    } catch { toast.error('Failed to create DM'); }
  }, [normalizeThread]);

  const sendFriendRequest = useCallback(async () => {
    if (!friendUsername.trim()) return;
    try {
      await api.post('@me/friends/requests', null, { params: { username: friendUsername.trim() } });
      toast.success('Friend request sent!');
      setFriendUsername('');
      loadFriendRequests();
      setActiveTab('pending');
    } catch { toast.error('User not found'); }
  }, [friendUsername, loadFriendRequests]);

  const acceptFriendRequest = useCallback(async (id) => {
    try {
      await api.post(`@me/friends/requests/${id}/accept`);
      loadFriendRequests();
      loadFriends();
      toast.success('Request accepted');
    } catch { toast.error('Action failed'); }
  }, [loadFriendRequests, loadFriends]);

  const deleteFriend = useCallback(async (id) => {
    try {
      await api.delete(`@me/friends/${id}`);
      loadFriends();
      toast.info('Friend removed');
    } catch { toast.error('Action failed'); }
  }, [loadFriends]);

  // Real-time listeners
  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = window.Echo.private(`user.${currentUser.id}`);
    channel.listen('.friendrequest.created', () => { toast.info('New friend request!'); loadFriendRequests(); })
      .listen('.friendrequest.accepted', () => { loadFriendRequests(); loadFriends(); })
      .listen('.channel.created', () => loadThreads());
    return () => window.Echo.leave(`user.${currentUser.id}`);
  }, [currentUser?.id, loadFriendRequests, loadFriends, loadThreads]);

  useEffect(() => {
    loadThreads();
    loadFriends();
    loadFriendRequests();
  }, [loadThreads, loadFriends, loadFriendRequests]);

  const activeChannel = useMemo(() =>
    activeThreadId === 'friends' ? null : dmThreads.find(t => t.id === activeThreadId),
    [activeThreadId, dmThreads]
  );

  return (
    <GuildContextProvider>
      <BaseAuthLayout>
        <div className="flex h-screen w-screen overflow-hidden bg-gray-700 text-gray-100">

          {/* SIDEBAR */}
          <aside className={`fixed inset-y-0 left-0 z-40 w-64 flex-col bg-gray-800 transition-transform md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex h-12 items-center border-b border-gray-900 px-4 shadow-sm">
              <input className="h-7 w-full rounded bg-gray-900 px-2 text-xs" placeholder="Find or start a conversation" />
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {/* Friends Navigation Button */}
              <button
                onClick={() => { setActiveThreadId('friends'); setIsSidebarOpen(false); }}
                className={`flex w-full items-center gap-3 rounded px-3 py-2 text-sm transition-colors ${activeThreadId === 'friends' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'}`}
              >
                <Users size={20} />
                <span className="font-medium">Friends</span>
              </button>

              <div className="mt-4 px-2 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
                Direct Messages
              </div>

              <div className="mt-2 space-y-0.5">
                {dmThreads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => { setActiveThreadId(thread.id); setIsSidebarOpen(false); }}
                    className={`group flex w-full items-center gap-3 rounded px-2 py-1.5 text-sm ${activeThreadId === thread.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'}`}
                  >
                    <div className="relative">
                      {/* {thread.user.avatar ? (
                        <img src={thread.user.avatar} className="size-8 rounded-full" alt="" />
                      ) : (
                        <div className="flex size-8 items-center justify-center rounded-full bg-gray-600 text-xs">
                          {thread.user.name.slice(0, 1)}
                        </div>
                      )} */}
                      <Avatar user={thread.user} className="size-8 rounded-full" />
                      <div className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-gray-800 bg-green-500" />
                    </div>
                    <span className="font-medium truncate">{thread.user.name}</span>

                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="relative flex flex-1 flex-col overflow-hidden">
            {activeThreadId === 'friends' ? (
              <div className="flex h-full flex-col">
                {/* Friends Header */}
                <header className="flex h-12 items-center gap-4 border-b border-gray-900 bg-gray-700 px-4 shadow-sm">
                  <div className="flex items-center gap-2 pr-4 border-r border-gray-600">
                    <Users size={20} className="text-gray-400" />
                    <span className="font-bold">Friends</span>
                  </div>
                  <nav className="flex items-center gap-4 text-sm font-medium">
                    {['online', 'all', 'pending'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`rounded px-2 py-1 capitalize ${activeTab === tab ? 'bg-gray-600 text-white' : 'text-gray-400 hover:bg-gray-600/50 hover:text-gray-200'}`}
                      >
                        {tab}
                      </button>
                    ))}
                    <button
                      onClick={() => setActiveTab('add_friend')}
                      className={`rounded px-2 py-1 text-green-500 ${activeTab === 'add_friend' ? 'bg-transparent text-green-400' : 'bg-green-600 text-white hover:bg-green-700'}`}
                    >
                      Add Friend
                    </button>
                  </nav>
                </header>

                <div className="flex-1 overflow-y-auto p-6">
                  {/* Add Friend View */}
                  {activeTab === 'add_friend' && (
                    <div className="max-w-2xl">
                      <h2 className="mb-2 text-sm font-bold uppercase">Add Friend</h2>
                      <p className="mb-4 text-xs text-gray-400">You can add a friend with their username.</p>
                      <form onSubmit={(e) => { e.preventDefault(); sendFriendRequest(); }} className="flex rounded-lg bg-gray-900 p-3 focus-within:ring-1 focus-within:ring-blue-500">
                        <input
                          value={friendUsername}
                          onChange={e => setFriendUsername(e.target.value)}
                          className="flex-1 bg-transparent outline-none"
                          placeholder="Enter a Username"
                        />
                        <button className="rounded bg-indigo-600 px-4 py-1 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50" disabled={!friendUsername}>
                          Send Friend Request
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Friends List Views */}
                  {(activeTab === 'online' || activeTab === 'all') && (
                    <div className="space-y-1">
                      <div className="mb-4 text-[10px] font-semibold uppercase text-gray-400">{activeTab} — {friends.length}</div>
                      {friends.map(friend => (
                        <div key={friend.id} className="group flex items-center justify-between border-t border-gray-600/30 px-2 py-3 hover:bg-gray-600/30 hover:rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar user={friend} className="size-8 rounded-full" />
                            <div>
                              <div className="text-sm font-bold">{friend.username}</div>
                              <div className="text-xs text-gray-400">Online</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => createDmThread(friend.id)} className="flex size-9 items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:text-green-400">
                              <MessageSquare size={18} />
                            </button>
                            <button onClick={() => deleteFriend(friend.id)} className="flex size-9 items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:text-red-400">
                              <UserMinus size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pending Requests View */}
                  {activeTab === 'pending' && (
                    <div className="space-y-1">
                      <div className="mb-4 text-[10px] font-semibold uppercase text-gray-400">Pending — {friendRequests.length}</div>
                      {friendRequests.map(req => {
                        const isOutgoing = req.sender_id === currentUser.id;
                        const user = isOutgoing ? req.receiver : req.sender;
                        return (
                          <div key={req.id} className="flex items-center justify-between border-t border-gray-600/30 px-2 py-3">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-full bg-gray-500" />
                              <div>
                                <div className="text-sm font-bold">{user.username}</div>
                                <div className="text-xs text-gray-400">{isOutgoing ? 'Outgoing Friend Request' : 'Incoming Friend Request'}</div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {!isOutgoing && (
                                <button onClick={() => acceptFriendRequest(req.id)} className="flex size-9 items-center justify-center rounded-full bg-gray-800 text-green-500 hover:bg-gray-900">
                                  <UserCheck size={18} />
                                </button>
                              )}
                              <button className="flex size-9 items-center justify-center rounded-full bg-gray-800 text-red-500 hover:bg-gray-900">
                                <UserMinus size={18} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <ChannelContextProvider>
                <Channel channel={{ ...activeChannel, name: activeChannel.user.name }} />
              </ChannelContextProvider>
            )}
          </main>

        </div>
        <UserSettings isOpen={isUserSettingsOpen} onClose={() => setIsUserSettingsOpen(false)} />
      </BaseAuthLayout>
    </GuildContextProvider>
  );
};

export default DirectMessagesPage;