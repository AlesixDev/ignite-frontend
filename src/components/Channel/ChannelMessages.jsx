import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner'
import { NotePencil, Trash, ArrowBendUpLeft, PushPin } from '@phosphor-icons/react';
import api from '../../api';
import useStore from '../../hooks/useStore';
import { useGuildsStore } from '../../stores/guilds.store';
import { useGuildContext } from '../../contexts/GuildContext';
import { useChannelContext } from '../../contexts/ChannelContext.jsx';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '../ui/context-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Badge } from '../ui/badge';
import GuildMemberContextMenu from '../GuildMemberContextMenu';
import GuildMemberPopoverContent from '../GuildMemberPopoverContent';
import { useChannelsStore } from '../../stores/channels.store';
import Avatar from '../Avatar.jsx';
import { PermissionsService } from '@/services/permissions.service';
import { Permissions } from '@/enums/Permissions';

const ChannelMessage = ({ message, prevMessage, pending }) => {
    const { guildId } = useGuildContext();
    const channelId = channelId;
    const store = useStore();
    const guildsStore = useGuildsStore();
    const authorMenuRef = useRef(null);
    const [authorMenuOpen, setAuthorMenuOpen] = useState(false);

    const { messages, setMessages, editingId, setEditingId, setReplyingId, setPinId, inputRef, setInputMessage } = useChannelContext();

    const authorColor = useMemo(() => {
        const members = guildsStore.guildMembers[guildId] || [];
        const member = members.find((m) => m.user_id === message.author.id);

        if (!member || !member.roles || member.roles.length === 0) return 'inherit';

        const sortedRoles = [...member.roles].sort((a, b) => b.position - a.position);
        const topRole = sortedRoles.find(r => r.color && r.color !== 0); // 0 is usually 'default/none'

        return topRole ? `#${topRole.color.toString(16).padStart(6, '0')}` : 'inherit';
    }, [guildId, guildsStore.guildMembers, message.author.id]); 1

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

    const isEditing = useMemo(() => editingId === message.id, [editingId, message.id]);
    const canEdit = useMemo(() => message.author.id === store.user.id, [message.author.id, store.user.id]);
    // const canDelete = useMemo(() => {
    //     if (message.author.id === store.user.id) return true;

    //     const activeGuild = guildsStore.guilds.find((g) => g.id == guildId);
    //     if (activeGuild?.owner_id == store.user.id) return true;

    //     const activeGuildMembers = guildsStore.guildMembers[guildId] || [];
    //     const member = activeGuildMembers.find((m) => m.user_id === store.user.id);
    //     if (!member) return false;

    //     // bitwise | all permissions in roles
    //     const allowedPermissions = member?.roles.reduce((acc, role) => {
    //         return acc | (role ? role.permissions : 0);
    //     }, 0);

    //     if (allowedPermissions & 8) { // MANAGE_MESSAGES
    //         return true;
    //     }

    //     return false;
    // }, [guildId, guildsStore.guilds, message.author.id, store.user.id]);

    const canDelete = useMemo(() => {
        return PermissionsService.hasPermission(guildId, 0, Permissions.MANAGE_MESSAGES);
    }, [guildId]);

    // console.log(store.user);
    // console.log(guildsStore.guilds);

    const [editedMessage, setEditedMessage] = useState(message.content);

    const onEdit = useCallback(async (event) => {
        event.preventDefault();

        if (!editedMessage || editedMessage === message.content) {
            setEditingId(null);
            return;
        }

        try {
            await api.put(`/channels/${channelId}/messages/${message.id}`, { content: editedMessage });
            setMessages(messages.map((m) => m.id === message.id ? { ...m, content: editedMessage, updated_at: new Date().toISOString() } : m));
            setEditingId(null);
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Could not edit message.');
        }
    }, [editedMessage, message.content, channelId, message.id, setEditingId, setMessages, messages]);

    const onDelete = useCallback(async () => {
        try {
            await api.delete(`/channels/${channelId}/messages/${message.id}`);
            setMessages(messages.filter((m) => m.id !== message.id));
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Could not delete message.');
        }
    }, [channelId, message.id, messages, setMessages]);

    const onReply = useCallback(() => {
        setReplyingId(message.id);
    }, [message.id, setReplyingId]);

    const onPin = useCallback(async () => {
        try {
            await api.post(`/channels/${channelId}/messages/${message.id}/pin`);
            setPinId(message.id);
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Could not pin message.');
        }
        toast.info('Pinning is not available yet.');
    }, [channelId, message.id, setPinId]);

    useEffect(() => {
        if (!authorMenuOpen) return;
        const onDown = (event) => {
            if (!authorMenuRef.current) return;
            if (!authorMenuRef.current.contains(event.target)) {
                setAuthorMenuOpen(false);
            }
        };
        const onKey = (event) => {
            if (event.key === 'Escape') setAuthorMenuOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [authorMenuOpen]);

    // TODO: This is duplicated
    const onMention = useCallback((user) => {
        setInputMessage((prev) => `${prev} @${user.username} `);
        inputRef.current.focus();
    }, [inputRef, setInputMessage]);

    return (
        <Popover>
            <ContextMenu>
                <ContextMenuTrigger className={`group relative block py-1 data-[state=open]:bg-gray-800/60 ${isEditing ? 'bg-gray-800/60' : 'hover:bg-gray-800/60'} ${shouldStack ? '' : 'mt-3.5'}`}>
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
                                        <GuildMemberContextMenu user={message.author} onMention={onMention} />
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
                                    {message.content}
                                    {(message.updated_at && message.created_at !== message.updated_at) && (
                                        <span className="ml-1 text-[0.65rem] text-gray-500">(edited)</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    {(!isEditing && !pending) && (
                        <div className="absolute -top-4 right-4 hidden rounded-md border border-gray-800 bg-gray-700 group-hover:flex">
                            <button type="button" onClick={onPin} className="rounded-md p-2 text-sm text-white/90 hover:bg-primary/10 hover:text-primary">
                                <PushPin className="size-5" />
                            </button>
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
                            <button type="button" onClick={onReply} className="rounded-md p-2 text-sm text-white/90 hover:bg-primary/10 hover:text-primary">
                                <ArrowBendUpLeft className="size-5" />
                            </button>
                        </div>
                    )}
                </ContextMenuTrigger>
                <ContextMenuContent className="w-52">
                    <ContextMenuItem>
                        Add Reaction
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    {canEdit && (
                        <ContextMenuItem onSelect={() => setEditingId(message.id)}>
                            Edit Message
                        </ContextMenuItem>
                    )}
                    <ContextMenuItem onSelect={onReply}>
                        Reply
                    </ContextMenuItem>
                    <ContextMenuItem>
                        Forward
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => {
                        navigator.clipboard.writeText(message.content);
                        toast.success('Message text copied to clipboard.');
                    }}>
                        Copy Text
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={onPin}>
                        Pin Message
                    </ContextMenuItem>
                    <ContextMenuItem>
                        Mark Unread
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => {
                        const link = `${message.id}`;
                        navigator.clipboard.writeText(link);
                        toast.success('Message link copied to clipboard.');
                    }}>
                        Copy Message ID
                    </ContextMenuItem>
                    <ContextMenuItem>
                        Speak Message
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
};

const ChannelMessages = ({ channelId, messagesRef, highlightId, onLoadMore, loadingMore, hasMore }) => {
    const { setEditingId, replyingId, setReplyingId } = useChannelContext();
    const { channelMessages, channelPendingMessages } = useChannelsStore();
    const [atTop, setAtTop] = useState(false);

    const pendingMessages = channelPendingMessages[channelId] || [];

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

    const messages = channelMessages[channelId] || [];

    return (
        <div
            className={`min-h-0 flex-1 overflow-y-auto ${replyingId ? ' md:max-h-[calc(100vh-11.5rem)]' : ' md:max-h-[calc(100vh-9rem)]'}`}
            ref={messagesRef}
            onScroll={onScroll}
        >
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
                        <ChannelMessage message={message} prevMessage={prevMessage} />
                    </div>
                );
            })}
            {pendingMessages && pendingMessages.map((message, index) => {
                const prevMessage = pendingMessages[index - 1] || messages[messages.length - 1] || null;
                return (
                    <ChannelMessage key={message.nonce} message={message} prevMessage={prevMessage} pending={true} />
                );
            })}
        </div>
    );
};

export default ChannelMessages;