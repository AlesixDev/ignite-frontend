import { useMemo, useCallback } from 'react';
import { UserStarIcon, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useChannelsStore } from '@/store/channels.store';
import useStore from '@/hooks/useStore';
import { useUnreadsStore } from '@/store/unreads.store';
import DMChannelItem from './DMChannelItem';
import { useFriendsStore } from '@/store/friends.store';
import { Badge } from '../ui/badge';

const DMSidebar = ({ activeChannelId, onNavigate }) => {
  const store = useStore();
  const currentUser = store.user || { id: 'me' };
  const { channels } = useChannelsStore();
  const { channelUnreads, channelUnreadsLoaded } = useUnreadsStore();
  const { requests } = useFriendsStore();

  // Helper to normalize thread data
  const normalizeThread = useCallback((thread) => {
    if (!thread) return null;
    const otherUser = (thread.recipients || []).find(r => r.id !== currentUser.id) || thread.user || {};
    return { ...thread, user: otherUser };
  }, [currentUser.id]);

  // Sort and prep channels
  const dmChannels = useMemo(() =>
    channels
      .filter(c => c.type === 1)
      .sort((a, b) => {
        if (!a.last_message_id) return 1;
        if (!b.last_message_id) return -1;
        return BigInt(a.last_message_id) < BigInt(b.last_message_id) ? 1 : -1;
      })
      .map(normalizeThread),
    [channels, normalizeThread]
  );

  // Find Pending Friend Requests Count
  const pendingCount = requests.filter(req => req.sender_id != currentUser.id).length;

  return (
    <aside className="flex w-80 flex-col bg-gray-800">
      <div className="flex-1 overflow-y-auto p-2">
        <Button
          variant={activeChannelId === 'friends' ? "secondary" : "ghost"}
          className="w-full justify-start gap-3 mb-1"
          onClick={() => onNavigate('friends')}
        >
          <UserStarIcon className="h-5 w-5" />
          <span className="font-medium">Friends</span>
          {pendingCount > 0 && (
            <Badge className="ml-auto h-4 min-w-4 bg-[#f23f42] p-1 text-[11px] hover:bg-[#f23f42] font-bold">
              {pendingCount}
            </Badge>
          )}
        </Button>

        <div className="border-b border-gray-700 my-2 mx-2" />

        <div className="mt-4 flex items-center px-2 text-[13px] font-semibold tracking-wider text-gray-500 group-hover:text-gray-300">
          Direct Messages
        </div>

        <div className="mt-2 space-y-0.5">
          {dmChannels.map((channel) => (
            <DMChannelItem
              key={channel.channel_id}
              channel={channel}
              isActive={activeChannelId === channel.channel_id}
              onClick={() => onNavigate(channel.channel_id)}
              channelUnreads={channelUnreads}
              channelUnreadsLoaded={channelUnreadsLoaded}
              channelsRaw={channels}
            />
          ))}
        </div>
      </div>
    </aside>
  );
};

export default DMSidebar;