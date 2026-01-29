import { useState, useMemo } from 'react';
import useStore from '../../hooks/useStore';
import { UserCheck, UserMinus, UserPlus, UserX } from 'lucide-react';
import Avatar from '../Avatar';
import { FriendsService } from '../../services/friends.service';
import { useFriendsStore } from '../../stores/friends.store';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '../ui/context-menu';
import { CircleNotch, DotsThree } from '@phosphor-icons/react';
import GuildMemberContextMenu from './GuildMemberContextMenu';
import { toast } from 'sonner';

const GuildMemberPopoverContent = ({ user, guild = null }) => {
  const store = useStore();

  const [loading, setLoading] = useState(true);

  const { friends, requests } = useFriendsStore();

  // TODO: Put in some helper file or in friends store

  const isFriend = useMemo(() => {
    return friends.some((friend) => friend.id === user.id);
  }, [friends, user.id]);

  const hasSentRequest = useMemo(() => {
    return requests.some((request) => request.receiver_id === user.id);
  }, [requests, user.id]);

  const hasReceivedRequest = useMemo(() => {
    return requests.some((request) => request.sender_id === user.id);
  }, [requests, user.id]);

  const friendRequestId = useMemo(() => {
    const request = requests.find((request) => request.sender_id === user.id || request.receiver_id === user.id);
    return request ? request.id : null;
  }, [requests, user.id]);

  const sendFriendRequest = () => {
    FriendsService.sendRequest(user.username).then(() => {
      toast.success(`Friend request sent to ${user.username}`);
    }).catch(() => {
      toast.error(`Failed to send friend request to ${user.username}`);
    });
  };

  setTimeout(() => {
    setLoading(false);
  }, 250);

  return (
    <>
      {loading ? (
        <CircleNotch className="mx-auto animate-spin text-gray-500" />
      ) : (
        <div className="w-72 rounded">
          <div className="relative h-28">
            <div className="h-full rounded bg-primary">
              {/* banner image */}
            </div>
            <div className="absolute -bottom-12 left-3">
              <div className="rounded-full border-[6px] border-background bg-gray-700">
                <Avatar user={user} className="size-24 !cursor-default text-4xl" />
              </div>
              {/* online indicator (always online) */}
              <div className="absolute bottom-1.5 right-1.5 size-6 rounded-full border-4 border-background bg-green-500" />
            </div>
            <div className="absolute right-2 top-2 flex items-center gap-2">
              {user.id !== store.user.id && (
                <>
                  {!isFriend && !hasSentRequest && !hasReceivedRequest && (
                    <button
                      type="button"
                      onClick={sendFriendRequest}
                      className="flex items-center justify-center rounded-full bg-black/30 p-1.5 text-white transition hover:bg-black/40"
                    >
                      <UserPlus className="size-4" />
                    </button>
                  )}
                  {isFriend && (
                    <button
                      type="button"
                      onClick={() => FriendsService.removeFriend(friendRequestId)}
                      className="flex items-center justify-center rounded-full bg-black/30 p-1.5 text-white transition hover:bg-black/40"
                    >
                      <UserMinus className="size-4" />
                    </button>
                  )}
                  {hasSentRequest && (
                    <button
                      type="button"
                      onClick={() => FriendsService.cancelRequest(friendRequestId)}
                      className="flex items-center justify-center rounded-full bg-black/30 p-1.5 text-white transition hover:bg-black/40"
                      title="Cancel Friend Request"
                    >
                      <UserX className="size-4" />
                    </button>
                  )}
                  {hasReceivedRequest && (
                    <button
                      type="button"
                      onClick={() => FriendsService.acceptRequest(friendRequestId)}
                      className="flex items-center justify-center rounded-full bg-black/30 p-1.5 text-white transition hover:bg-black/40"
                      title="Accept Friend Request"
                    >
                      <UserCheck className="size-4" />
                    </button>
                  )}
                </>
              )}
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex cursor-pointer items-center justify-center rounded-full bg-black/30 p-1.5 text-white transition hover:bg-black/40"
                    title="More Options"
                  >
                    <DotsThree className="size-4" />
                    {/* todo: not working */}
                  </button>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <GuildMemberContextMenu user={user} />
                </ContextMenuContent>
              </ContextMenu>
            </div>
          </div>
          <div>
            <div className="mt-14 px-4 pb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-100">
                  {user.username}
                </h2>
                <p className="text-sm text-gray-500">{user.id}</p>
              </div>
              {/* bio: */}
              <div className="mt-4">
                <p className="text-sm text-gray-400">
                  This user has no bio.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GuildMemberPopoverContent;
