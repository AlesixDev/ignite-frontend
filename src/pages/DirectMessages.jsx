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

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";
import { FriendsService } from '../services/friends.service';
import { useFriendsStore } from '../stores/friends.store';
import { useChannelsStore } from '../stores/channels.store';
import { ChannelsService } from '../services/channels.service';

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

  const { friends, requests } = useFriendsStore();
  const { channels } = useChannelsStore();

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);

  const normalizeThread = useCallback((thread) => {
    if (!thread) return null;
    const id = thread.id || thread.channel_id || thread.channelId;
    const otherUser = (thread.recipients || []).find(r => r.id !== currentUser.id) || thread.user || {};
    return { id, channel_id: id, user: otherUser };
  }, [currentUser.id]);

  // const createDmThread = useCallback(async (recipientId) => {
  //   // try {
  //   //   const { data } = await api.post('@me/channels', { recipients: [recipientId] });
  //   //   const normalized = normalizeThread(data);
  //   //   if (normalized) {
  //   //     setDmThreads(prev => prev.find(t => t.id === normalized.id) ? prev : [normalized, ...prev]);
  //   //     setActiveThreadId(normalized.id);
  //   //   }
  //   // } catch { toast.error('Failed to create DM'); }
  // }, [normalizeThread]);

  // Real-time listeners
  // useEffect(() => {
  //   if (!currentUser?.id) return;
  //   const channel = window.Echo.private(`user.${currentUser.id}`);
  //   channel.listen('.friendrequest.created', () => { toast.info('New friend request!'); })
  //     .listen('.friendrequest.accepted', () => { })
  //     .listen('.channel.created', () => { });
  //   return () => window.Echo.leave(`user.${currentUser.id}`);
  // }, [currentUser?.id]);

  const messageUser = useCallback((userId) => {
    const existingChannel = channels.find(c => c.type === 1 && c.recipients.some(r => r.id === userId));

    console.log('existingChannel', existingChannel);
    if (existingChannel) {
      setActiveThreadId(existingChannel.channel_id);
    } else {
      ChannelsService.createChannel([userId])
        .then(channel => {
          setActiveThreadId(channel.channel_id);
        })
        .catch(() => {
          toast.error('Failed to create DM channel');
        });
    }
  }, [channels]);

  const cancelFriendRequest = useCallback((requestId) => {
    FriendsService.cancelRequest(requestId)
      .then(() => {
        toast.success('Friend request cancelled');
      })
      .catch(() => {
        toast.error('Failed to cancel friend request');
      });
  }, []);

  const acceptFriendRequest = useCallback((requestId) => {
    FriendsService.acceptRequest(requestId)
      .then(() => {
        toast.success('Friend request accepted');
      })
      .catch(() => {
        toast.error('Failed to accept friend request');
      });
  }, []);

  const sendFriendRequest = useCallback((e) => {
    e.preventDefault();
    FriendsService.sendRequest(friendUsername)
      .then(() => {
        toast.success('Friend request sent');
        setFriendUsername('');
      })
      .catch((error) => {
        if (error?.response?.status === 404) {
          toast.error('User not found');
        } else {
          toast.error('Failed to send friend request');
        }
      });
  }, [friendUsername]);

  const dmChannels = useMemo(() => channels.filter(c => c.type === 1).map(normalizeThread), [channels]);

  const activeChannel = useMemo(() =>
    activeThreadId === 'friends' ? null : dmChannels.find(t => t.id === activeThreadId),
    [activeThreadId, dmChannels]
  );

  return (
    <GuildContextProvider>
      <BaseAuthLayout>
        <div className="flex h-screen w-screen overflow-hidden bg-gray-700 text-gray-100 select-none">

          {/* SIDEBAR */}
          <aside className={`fixed inset-y-0 left-0 z-40 w-64 flex-col bg-gray-800 transition-transform md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex-1 overflow-y-auto p-2">
              {/* Friends Navigation Button */}
              <Button
                variant={activeThreadId === 'friends' ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 mb-1"
                onClick={() => setActiveThreadId('friends')}
              >
                <Users className="h-5 w-5" />
                <span className="font-medium">Friends</span>
              </Button>

              <div className="mt-4 px-2 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
                Direct Messages
              </div>

              <div className="mt-2 space-y-0.5">
                {dmChannels.map((channel) => (
                  <button
                    key={channel.channel_id}
                    onClick={() => { setActiveThreadId(channel.channel_id); setIsSidebarOpen(false); }}
                    className={`group flex w-full items-center gap-3 rounded px-2 py-1.5 text-sm ${activeThreadId === channel.channel_id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'}`}
                  >
                    <div className="relative">
                      {/* {thread.user.avatar ? (
                        <img src={thread.user.avatar} className="size-8 rounded-full" alt="" />
                      ) : (
                        <div className="flex size-8 items-center justify-center rounded-full bg-gray-600 text-xs">
                          {thread.user.name.slice(0, 1)}
                        </div>
                      )} */}
                      <Avatar user={channel.user} className="size-8 rounded-full" />
                      <div className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-gray-800 bg-green-500" />
                    </div>
                    <span className="font-medium truncate">{channel.user.name}</span>

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
                <header className="flex h-12 items-center justify-between px-4 shadow-sm border-b border-[#1f2124]">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[#f2f3f5] font-semibold">
                      <Users size={20} className="text-[#80848e]" />
                      Friends
                    </div>
                    <Separator orientation="vertical" className="h-6 bg-[#4e5058]" />
                    <nav className="flex items-center gap-2">
                      {[
                        { id: 'online', label: 'Online' },
                        { id: 'all', label: 'All' },
                        { id: 'pending', label: 'Pending', count: requests.filter(req => req.sender_id != currentUser.id).length },
                      ].map(tab => (
                        <Button
                          key={tab.id}
                          variant={activeTab === tab.id ? "secondary" : "ghost"}
                          size="sm"
                          className="h-7 px-3 text-sm font-medium"
                          onClick={() => setActiveTab(tab.id)}
                        >
                          {tab.label}
                          {tab.count > 0 && (
                            <Badge className="ml-2 h-4 min-w-4 bg-[#f23f42] p-1 text-[10px] hover:bg-[#f23f42]">
                              {tab.count}
                            </Badge>
                          )}
                        </Button>
                      ))}
                      <Button
                        variant={activeTab === 'add_friend' ? "ghost" : "default"}
                        size="sm"
                        className={`h-7 px-2 text-sm font-medium ${activeTab === 'add_friend' ? 'text-[#23a559]' : 'bg-[#248046] hover:bg-[#1a6334] text-white'}`}
                        onClick={() => setActiveTab('add_friend')}
                      >
                        Add Friend
                      </Button>
                    </nav>
                  </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6">
                  {/* Add Friend View */}
                  {activeTab === 'add_friend' && (
                    <div className="w-full">
                      <h2 className="text-lg font-semibold text-white mb-2">Add Friend</h2>
                      <p className="text-xs text-white mb-4">You can add a friend with their Ignite username.</p>
                      <form onSubmit={sendFriendRequest} className="relative flex items-center bg-[#1e1f22] rounded-sm p-1.5 px-0.5 border border-gray-600 focus-within:border-[#00a8fc]">
                        <Input
                          value={friendUsername}
                          onChange={e => setFriendUsername(e.target.value)}
                          className="border-0 bg-transparent focus-visible:ring-0 text-sm"
                          placeholder="You can add friends with their Ignite username"
                        />
                        <Button
                          type="submit"
                          disabled={!friendUsername}
                          className="bg-[#5865f2] hover:bg-[#4752c4] h-8 text-xs font-medium mr-2"
                        >
                          Send Friend Request
                        </Button>
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
                            <button onClick={() => messageUser(friend.id)} className="flex size-9 items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:text-green-400">
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
                      <div className="mb-4 text-[10px] font-semibold uppercase text-gray-400">Pending — {requests.length}</div>
                      {requests.map(req => {
                        const isOutgoing = req.sender_id === currentUser.id;
                        const user = isOutgoing ? req.receiver : req.sender;
                        return (
                          <div key={req.id} className="flex items-center justify-between border-t border-gray-600/30 px-2 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar user={user} className="size-8 rounded-full" />
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
                              <button onClick={() => cancelFriendRequest(req.id)} className="flex size-9 items-center justify-center rounded-full bg-gray-800 text-red-500 hover:bg-gray-900">
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