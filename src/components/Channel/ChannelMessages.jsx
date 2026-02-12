import { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react';
import { toast } from 'sonner'
import { NotePencil, Trash, ArrowBendUpLeft, PushPin, CircleNotch, Smiley } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import api from '../../api';
import useStore from '../../hooks/useStore';
import { useGuildsStore } from '../../store/guilds.store';
import { useGuildContext } from '../../contexts/GuildContext';
import { useChannelContext, useChannelInputContext } from '../../contexts/ChannelContext.jsx';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '../ui/context-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Badge } from '../ui/badge';
import { EmojiPicker, EmojiPickerSearch, EmojiPickerContent, EmojiPickerFooter } from '../ui/emoji-picker';
import GuildMemberContextMenu from '../GuildMember/GuildMemberContextMenu';
import GuildMemberPopoverContent from '../GuildMember/GuildMemberPopoverContent';
import { useChannelsStore } from '../../store/channels.store';
import Avatar from '../Avatar.jsx';
import { PermissionsService } from '@/services/permissions.service';
import { Permissions } from '@/enums/Permissions';
import { ChannelsService } from '@/services/channels.service';
import { UnreadsService } from '@/services/unreads.service';
import MessageContent from '../MessageContent/MessageContent.jsx';

const ChannelMessage = memo(({ message, prevMessage, pending, isEditing, setEditingId }) => {
    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
    const { guildId } = useGuildContext();
    const channelId = message.channel_id;
    const store = useStore();
    const guildsStore = useGuildsStore();
    const channelReactions = useChannelsStore(s => s.channelReactions);

    // const { setInputMessage } = useChannelInputContext();

    const authorColor = useMemo(() => {
        const members = guildsStore.guildMembers[guildId] || [];
        const member = members.find((m) => m.user_id === message.author.id);

        if (!member || !member.roles || member.roles.length === 0) return 'inherit';

        const sortedRoles = [...member.roles].sort((a, b) => b.position - a.position);
        const topRole = sortedRoles.find(r => r.color && r.color !== 0); // 0 is usually 'default/none'

        return topRole ? `#${topRole.color.toString(16).padStart(6, '0')}` : 'inherit';
    }, [guildId, guildsStore.guildMembers, message.author.id]);

    const formattedDateTime = useMemo(() => {
        const date = new Date(message.created_at);

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const isToday = date.toDateString() === today.toDateString();
        const isYesterday = date.toDateString() === yesterday.toDateString();

        const day = isToday ? 'Today' : isYesterday ? 'Yesterday' : date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

        return `${day} at ${time}`;
    }, [message.created_at]);

    const shouldStack = useMemo(() => {
        if (prevMessage) {
            const sameAuthor = prevMessage.author.id === message.author.id;
            const sameName = prevMessage.author.name === message.author.name;
            const sentWithinMinute = (new Date(message.created_at) - new Date(prevMessage.created_at)) / 1000 < 60;

            return sameAuthor && sameName && sentWithinMinute;
        }
    }, [prevMessage, message]);

    const canEdit = useMemo(() => message.author.id === store.user.id, [message.author.id, store.user.id]);

    const canDelete = useMemo(() => {
        // Authors can always delete their own messages
        if (message.author.id === store.user.id) return true;

        // Moderators with MANAGE_MESSAGES can delete any message
        if (!guildId || !message.channel_id) return false;
        return PermissionsService.hasPermission(guildId, message.channel_id, Permissions.MANAGE_MESSAGES);
    }, [guildId, message.channel_id, message.author.id, store.user.id]);

    const isMentioned = useMemo(() => {
        if (!message.mentions || !store.user?.id) return false;
        return message.mentions.some((mention) => mention.user_id === store.user.id);
    }, [message.mentions, store.user?.id]);

    const [editedMessage, setEditedMessage] = useState(message.content);

    const onEdit = useCallback(async (event) => {
        event.preventDefault();

        if (!editedMessage || editedMessage === message.content) {
            setEditingId(null);
            return;
        }

        try {
            await api.put(`/channels/${channelId}/messages/${message.id}`, { content: editedMessage });
            // Update the Zustand store directly for immediate UI feedback
            const { channelMessages, setChannelMessages } = useChannelsStore.getState();
            const messages = channelMessages[channelId] || [];
            setChannelMessages(channelId, messages.map((m) => m.id === message.id ? { ...m, content: editedMessage, updated_at: new Date().toISOString() } : m));
            setEditingId(null);
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Could not edit message.');
        }
    }, [editedMessage, message.content, channelId, message.id, setEditingId]);

    const onDelete = useCallback(async () => {
        try {
            await api.delete(`/channels/${channelId}/messages/${message.id}`);
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Could not delete message.');
        }
    }, [channelId, message.id]);

    const handleAddReaction = useCallback((selectedEmoji) => {
        if (!message.id || !channelId) return;
        ChannelsService.toggleMessageReaction(channelId, message.id, selectedEmoji.emoji);
    }, [message.id, channelId]);

    const handleReactionToggle = useCallback((messageId, emoji) => {
        if (!messageId || !channelId) return;
        ChannelsService.toggleMessageReaction(channelId, messageId, emoji);
    }, [channelId]);

    // FRONTEND-ONLY: Reactions are computed from the Zustand store (in-memory storage).
    const messageReactions = useMemo(() => {
        const reactions = channelReactions[channelId]?.[message.id] || [];
        return reactions.map(reaction => ({
            ...reaction,
            me: reaction.users.includes(store.user.id)
        }));
    }, [channelReactions, channelId, message.id, store.user.id]);

    return (
        <Popover>
            <ContextMenu>
                <ContextMenuTrigger className={`group relative block py-1 data-[state=open]:bg-gray-800/60 ${isEditing ? 'bg-gray-800/60' : isMentioned ? 'bg-yellow-900/20 hover:bg-yellow-900/30 border-l-4 border-yellow-600' : 'hover:bg-gray-800/60'} ${shouldStack ? '' : 'mt-3.5'}`}>
                    <div className="flex items-start px-4 gap-4">
                        {shouldStack ? (
                            <div className="w-10" />
                        ) : (
                            <ContextMenu>
                                <PopoverTrigger>
                                    <ContextMenuTrigger>
                                        <Avatar user={message.author} className="size-10" />
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                        <GuildMemberContextMenu user={message.author} />
                                    </ContextMenuContent>
                                </PopoverTrigger>
                            </ContextMenu>
                        )}

                        <div className="flex flex-1 flex-col items-start justify-start">
                            {shouldStack ? null : (
                                <div className="relative mb-1 flex justify-start leading-none">
                                    <PopoverTrigger>
                                        <span
                                            className="font-semibold leading-none"
                                            style={{ color: authorColor }}
                                        >
                                            {message?.author.name} {message?.author.is_webhook && <Badge>Webhook</Badge>} {message?.author.is_bot && <Badge>Bot</Badge>}
                                        </span>
                                    </PopoverTrigger>
                                    <p className="ml-2 self-end text-xs font-medium leading-tight text-gray-500">
                                        {formattedDateTime}
                                    </p>
                                </div>
                            )}

                            {isEditing ? (
                                <div className="my-2 w-full">
                                    <div className="mb-1 flex items-center rounded-lg bg-gray-600 px-4 py-2">
                                        <form onSubmit={(e) => onEdit(e)} className="w-full">
                                            <input
                                                className="w-full border-0 bg-inherit p-0 text-white outline-none placeholder:text-gray-400 focus:ring-0"
                                                type="text"
                                                value={editedMessage}
                                                onChange={(e) => setEditedMessage(e.target.value)}
                                                autoFocus
                                            />
                                        </form>
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        escape to <button onClick={() => setEditingId(null)} className="text-primary hover:underline">cancel</button> •
                                        enter to <button onClick={(e) => onEdit(e)} className="text-primary hover:underline">save</button>
                                    </p>
                                </div>
                            ) : (
                                <div
                                    className={`text-gray-400 break-words break-all whitespace-pre-wrap ${pending ? 'opacity-50' : ''}`}
                                >
                                    <MessageContent content={message.content} />
                                    {(message.updated_at && message.created_at !== message.updated_at) && (
                                        <span className="ml-1 text-[0.65rem] text-gray-500">(edited)</span>
                                    )}
                                </div>
                            )}

                            {messageReactions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2 -ml-14 pl-14">
                                    {messageReactions.map((reaction) => (
                                        <button
                                            key={reaction.emoji}
                                            type="button"
                                            onClick={() => handleReactionToggle(message.id, reaction.emoji)}
                                            className={cn(
                                                "inline-flex items-center gap-1 px-2 py-1 rounded border text-sm transition-colors",
                                                reaction.me
                                                    ? "bg-primary/20 border-primary/50 hover:bg-primary/30 hover:border-primary/60"
                                                    : "bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-600"
                                            )}
                                        >
                                            <span className="text-base leading-none">{reaction.emoji}</span>
                                            <span className="text-xs font-medium text-gray-300">{reaction.count}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    {(!isEditing && !pending) && (
                        <div className={`absolute -top-4 right-4 rounded-md border border-gray-800 bg-gray-700 z-40 ${emojiPickerOpen ? 'flex' : 'hidden group-hover:flex'}`}>
                            <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                                <PopoverTrigger asChild>
                                    <button type="button" className="rounded-md p-2 text-sm text-white/90 hover:bg-primary/10 hover:text-primary">
                                        <Smiley className="size-5" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent side="bottom" align="end" sideOffset={8} avoidCollisions={false} className="p-0 w-[350px] h-[400px] flex flex-col overflow-hidden z-50">
                                    <EmojiPicker onEmojiSelect={handleAddReaction}>
                                        <EmojiPickerSearch />
                                        <EmojiPickerContent />
                                        <EmojiPickerFooter />
                                    </EmojiPicker>
                                </PopoverContent>
                            </Popover>
                            {/* <button type="button" onClick={onPin} className="rounded-md p-2 text-sm text-white/90 hover:bg-primary/10 hover:text-primary">
                                <PushPin className="size-5" />
                            </button> */}
                            {canEdit && (
                                <button type="button" onClick={() => setEditingId(message.id)} className="rounded-md p-2 text-sm text-white/90 hover:bg-primary/10 hover:text-primary">
                                    <NotePencil className="size-5" />
                                </button>
                            )}
                            {canDelete && (
                                <button type="button" onClick={onDelete} className="rounded-md p-2 text-sm text-white/90 hover:bg-primary/10 hover:text-primary">
                                    <Trash className="size-5" />
                                </button>
                            )}
                            {/* <button type="button" onClick={onReply} className="rounded-md p-2 text-sm text-white/90 hover:bg-primary/10 hover:text-primary">
                                <ArrowBendUpLeft className="size-5" />
                            </button> */}
                        </div>
                    )}
                </ContextMenuTrigger>
                <ContextMenuContent className="w-52">
                    {canEdit && (
                        <>
                            <ContextMenuItem onSelect={() => setEditingId(message.id)}>
                                Edit Message
                            </ContextMenuItem>

                            <ContextMenuSeparator />
                        </>
                    )}
                    <ContextMenuItem onSelect={() => {
                        navigator.clipboard.writeText(message.content);
                        toast.success('Message text copied to clipboard.');
                    }}>
                        Copy Text
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => {
                        const link = `${message.id}`;
                        navigator.clipboard.writeText(link);
                        toast.success('Message link copied to clipboard.');
                    }}>
                        Copy Message ID
                    </ContextMenuItem>
                    {canDelete && (
                        <>
                            <ContextMenuSeparator />
                            <ContextMenuItem onSelect={onDelete} className="text-red-500 hover:bg-red-600/20">
                                Delete Message
                            </ContextMenuItem>
                        </>
                    )}
                </ContextMenuContent>
            </ContextMenu>
            <PopoverContent className="w-auto p-2" align="start" alignOffset={0}>
                <GuildMemberPopoverContent user={message.author} guild={null} />
            </PopoverContent>
        </Popover>
    );
});

const ChannelMessages = ({ channel }) => {
    const { editingId, setEditingId, replyingId, setReplyingId } = useChannelContext();
    const channelMessages = useChannelsStore(s => s.channelMessages);
    const channelPendingMessages = useChannelsStore(s => s.channelPendingMessages);
    const [atTop, setAtTop] = useState(false);

    const [forceScrollDown, setForceScrollDown] = useState(false);
    const [highlightId, setHighlightId] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const messagesRef = useRef();

    const messages = channelMessages[channel?.channel_id] || [];
    const pendingMessages = channelPendingMessages[channel?.channel_id] || [];


    const onLoadMore = useCallback(async () => {
        const oldestMessage = messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];

        console.log('Loading more messages before ID:', oldestMessage.id);

        //ChannelsService.loadChannelMessages(channel?.channel_id, oldestMessage.id);
    }, [channel, messages]);

    useEffect(() => {
        // If the channel id exists and we don't have messages loaded yet, load them
        if (channel?.channel_id && channelMessages[channel?.channel_id] == null) {
            setIsLoading(true);
            ChannelsService.loadChannelMessages(channel?.channel_id).then(() => {
                setHasMore(channelMessages[channel?.channel_id]?.length === 50);
                setTimeout(() => setForceScrollDown(true), 0);
            }).finally(() => setIsLoading(false));
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
                        channel?.channel_id,
                        lastMessageId
                    );

                    lastAckTime = now;
                    lastAckedMessageId = lastMessageId;
                }

                UnreadsService.setLastReadMessageId(channel?.channel_id, lastMessageId);
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

    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setEditingId(null);
                setReplyingId(null);
            }
        };

        window.addEventListener('keydown', handleEscape);

        return () => {
            window.removeEventListener('keydown', handleEscape);
        };
    }, [setEditingId, setReplyingId]);

    const onScroll = useCallback(() => {
        const el = messagesRef.current;
        if (!el) return;
        setAtTop(el.scrollTop <= 10);
    }, [messagesRef]);

    useEffect(() => {
        const el = messagesRef.current;
        if (!el) return;
        setAtTop(el.scrollTop <= 10);
    }, [messagesRef]);

    return (
        <div
            className="flex-1 min-h-0 overflow-y-auto"
            ref={messagesRef}
            onScroll={onScroll}
        >
            {isLoading ? (
                <CircleNotch size={32} className="mx-auto animate-spin text-gray-500" />
            ) : (
                <>
                    {atTop && hasMore && (
                        <div className="sticky top-0 z-10 flex justify-center bg-gray-700/80 px-4 py-2 backdrop-blur">
                            <button
                                type="button"
                                onClick={onLoadMore}
                                disabled={loadingMore}
                                className="rounded bg-gray-800 px-3 py-1 text-xs text-gray-200 hover:bg-gray-700 disabled:opacity-60"
                            >
                                {loadingMore ? 'Loading…' : 'Load history'}
                            </button>
                        </div>
                    )}

                    {!hasMore && (
                        <div className="px-4 py-2 text-center text-xs text-gray-500">
                            Beginning of channel
                        </div>
                    )}

                    {messages && messages.map((message, index) => {
                        const prevMessage = messages[index - 1] || null;
                        return (
                            <div key={message.id} id={`msg-${message.id}`} className={highlightId === message.id ? 'rounded ring-2 ring-primary' : ''}>
                                <ChannelMessage
                                    message={message}
                                    prevMessage={prevMessage}
                                    isEditing={editingId === message.id}
                                    setEditingId={setEditingId}
                                />
                            </div>
                        );
                    })}
                    {pendingMessages && pendingMessages.map((message, index) => {
                        const prevMessage = pendingMessages[index - 1] || messages[messages.length - 1] || null;
                        return (
                            <ChannelMessage
                                key={message.nonce}
                                message={message}
                                prevMessage={prevMessage}
                                pending={true}
                                isEditing={false}
                                setEditingId={setEditingId}
                            />
                        );
                    })}
                </>
            )}
        </div>
    );
};

export default ChannelMessages;
