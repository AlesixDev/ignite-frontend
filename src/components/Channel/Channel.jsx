import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { GuildsService } from '../../services/guilds.service';
import { useGuildsStore } from '../../store/guilds.store';
import { useGuildContext } from '../../contexts/GuildContext';
import ChannelBar from './ChannelBar.jsx';
import { useChannelsStore } from '../../store/channels.store';
import { ChannelsService } from '../../services/channels.service';
import { UnreadsService } from '../../services/unreads.service';
import ChannelInput from './ChannelInput';
import ChannelMessages from './ChannelMessages';
import { ChannelType } from '../../enums/ChannelType';
import MemberList from './MemberList';


const Channel = ({ channel }) => {
  const { guildId } = useGuildContext();
  const [forceScrollDown, setForceScrollDown] = useState(false);
  const [highlightId, setHighlightId] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const messagesRef = useRef();
  const { channelMessages, channelPendingMessages } = useChannelsStore();

  const messages = channelMessages[channel?.channel_id] || [];

  useEffect(() => {
    // If the channel id exists and we don't have messages loaded yet, load them
    if (channel?.channel_id && channelMessages[channel?.channel_id] == null) {
      ChannelsService.loadChannelMessages(channel?.channel_id).then(() => {
        setHasMore(channelMessages[channel?.channel_id]?.length === 50);
        setTimeout(() => setForceScrollDown(true), 0);
      });
    }

    if (!messagesRef.current) return;

    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [channel?.channel_id]);

  // If scroll is near bottom send an ACK message
  useEffect(() => {
    if (!messages || !channel?.channel_id) return;

    const el = messagesRef.current;
    if (!el) return;

    let lastAckTime = 0;
    let lastAckedMessageId = null;

    function checkAndAckAtBottom() {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      const now = Date.now();
      if (nearBottom && messages.length > 0) {
        const lastMessageId = messages[messages.length - 1]?.id;

        if (now - lastAckTime > 10000 && lastAckedMessageId !== lastMessageId) {
          ChannelsService.acknowledgeChannelMessage(
            channel.channel_id,
            lastMessageId
          );

          lastAckTime = now;
          lastAckedMessageId = lastMessageId;
        }

        UnreadsService.setLastReadMessageId(channel.channel_id, lastMessageId);
      }
    }

    const interval = setInterval(checkAndAckAtBottom, 100);

    return () => {
      clearInterval(interval);
    };
  }, [channel?.channel_id, messages]);

  useEffect(() => {
    if (!messagesRef.current) return;
    const nearBottom = messagesRef.current.scrollHeight - messagesRef.current.scrollTop - messagesRef.current.clientHeight < 100;
    if (forceScrollDown || nearBottom) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      if (forceScrollDown) {
        setForceScrollDown(false);
      }
    }
  }, [channelPendingMessages, messages, forceScrollDown]);

  const { guildMembers } = useGuildsStore();

  const activeGuildMembers = guildMembers[guildId] || [];

  useEffect(() => {
    if (!guildId) return;

    GuildsService.loadGuildMembers(guildId);
  }, [guildId]);

  const onLoadMore = useCallback(async () => {
    const oldestMessage = messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];

    console.log('Loading more messages before ID:', oldestMessage.id);

    //ChannelsService.loadChannelMessages(channel.channel_id, oldestMessage.id);
  }, [channel, messages]);

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col bg-gray-700">
      <ChannelBar channel={channel} onJumpToMessage={() => { }} />
      <hr className="m-0 w-full border border-gray-800 bg-gray-800 p-0" />
      <div className="flex min-h-0 flex-1">
        <div className="relative flex h-full w-full flex-1 flex-col overflow-hidden">
          <ChannelMessages
            channelId={channel?.channel_id}
            messagesRef={messagesRef}
            highlightId={highlightId}
            onLoadMore={onLoadMore}
            loadingMore={loadingMore}
            hasMore={hasMore}
          />
          <ChannelInput channel={channel} />
        </div>

        {channel?.type !== ChannelType.DM && (
          <div className="hidden lg:flex">
            <MemberList guildId={guildId} activeGuildMembers={activeGuildMembers} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Channel;