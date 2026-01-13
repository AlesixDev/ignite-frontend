import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import useStore from '../hooks/useStore';
import api from '../api';
import { FriendsService } from '../services/friends.service';
import { useFriendsStore } from '../stores/friends.store';
import { ContextMenuItem, ContextMenuSeparator } from './ui/context-menu';

const GuildMemberContextMenu = ({ user, onMention = undefined }) => {
  const store = useStore();
  const navigate = useNavigate();

  const { friends, requests } = useFriendsStore();

  const isFriend = useMemo(() => {
    return friends.some((friend) => friend.id === user.id);
  }, [friends, user.id]);

  const hasPendingRequest = useMemo(() => {
    return requests.some((request) => request.id === user.id);
  }, [requests, user.id]);

  const onSendMessage = useCallback(async (author) => {
    if (author.id === store.user.id) {
      toast.info('You cannot DM yourself.');
      return;
    }
  
    try {
      await api.post('@me/channels', { recipients: [author.id] });
      navigate('/channels/@me');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Could not create direct message.');
    }
  }, [navigate, store.user.id]);

  return (
    <>
      <ContextMenuItem onSelect={() => {
        toast.info('Profile feature is not available yet.');
      }}>
        View Profile
      </ContextMenuItem>
      {onMention !== undefined && (
        <ContextMenuItem onSelect={() => onMention(user)}>
          Mention
        </ContextMenuItem>
      )}
      {user.id !== store.user.id && (
        <>
          <ContextMenuItem onSelect={() => onSendMessage(user)}>
            Send Message
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => {
            toast.info('Change Nickname feature is not available yet.');
          }}>
            Change Nickname
          </ContextMenuItem>
          {!isFriend && !hasPendingRequest && (
            <ContextMenuItem onSelect={() => FriendsService.sendRequest(user.id)}>
              Add Friend
            </ContextMenuItem>
          )}
          {isFriend && (
            <ContextMenuItem onSelect={() => FriendsService.removeFriend(user.id)}>
              Remove Friend
            </ContextMenuItem>
          )}
          {hasPendingRequest && (
            <ContextMenuItem onSelect={() => FriendsService.cancelRequest(user.id)}>
              Cancel Friend Request
            </ContextMenuItem>
          )}
          <ContextMenuItem onSelect={() => {
            toast.info('Ignore feature is not available yet.');
          }}>
            Ignore
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => {
            toast.info('Block feature is not available yet.');
          }}>
            Block
          </ContextMenuItem>
        </>
      )}
    </>
  );
};

export default GuildMemberContextMenu;
