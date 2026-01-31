
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Hash, Plus, CaretDown, CaretRight, NotePencil, Trash } from '@phosphor-icons/react';
import { toast } from 'sonner'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import CreateGuildChannelDialog from '@/components/Guild/CreateGuildChannelDialog';
import api from '@/api';
import { GuildsService } from '@/services/guilds.service';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { useUnreadsStore } from '@/stores/unreads.store';
import { UnreadsService } from '@/services/unreads.service';
import { ChannelsService } from '@/services/channels.service';
import { useChannelsStore } from '@/stores/channels.store';
import CreateGuildCategoryDialog from '@/components/Guild/CreateGuildCategoryDialog';

const SortableChannel = ({
    channel,
    isActive,
    isUnread,
    mentionsCount,
    expanded,
    canManageChannels,
    onEditChannel,
    handleDeleteChannel,
    navigate
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: channel.channel_id, disabled: !canManageChannels });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none',
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative'
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <ContextMenu>
                <ContextMenuTrigger>
                    <Link
                        to={`/channels/${channel.guild_id}/${channel.channel_id}`}
                        className={`${!expanded && !isActive ? 'hidden' : ''} group relative block`}
                        draggable="false"
                        style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
                    >
                        {isUnread && (
                            <div className="absolute left-0 top-1/2 h-2 w-1 -translate-y-1/2 rounded-r-full bg-white transition-all" />
                        )}

                        <div
                            className={`relative mx-2 my-0.5 flex cursor-pointer items-center rounded px-2 py-1 transition-colors ${isActive
                                ? 'bg-gray-600 text-gray-100'
                                : isUnread
                                    ? 'text-gray-100 hover:bg-gray-700'
                                    : 'text-gray-500 hover:bg-gray-700 hover:text-gray-400'
                                }`}
                        >
                            <Hash className={`size-5 shrink-0 transition-colors ${isActive || isUnread ? 'text-gray-200' : 'text-gray-500 group-hover:text-gray-400'}`} />

                            <p className={`ml-1 truncate text-base transition-all select-none ${isActive || isUnread ? 'font-semibold text-white' : 'font-medium'}`}>
                                {channel.name}
                            </p>

                            {mentionsCount > 0 && (
                                <div className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                                    {mentionsCount}
                                </div>
                            )}
                        </div>
                    </Link>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-52">
                    <ContextMenuItem
                        disabled={!isUnread}
                        onSelect={async () => {
                            UnreadsService.setLastReadMessageId(channel.channel_id, channel.last_message_id || null);
                            toast.success('Channel marked as read.');
                            ChannelsService.acknowledgeChannelMessage(channel.channel_id, channel.last_message_id || null);
                        }}>
                        Mark as Read
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => navigate(`/channels/${channel.guild_id}/${channel.channel_id}`)}>
                        Go to Channel
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={async () => {
                        const channelLink = `${window.location.origin}/channels/${channel.guild_id}/${channel.channel_id}`;
                        try {
                            await navigator.clipboard.writeText(channelLink);
                            toast.success('Channel link copied to clipboard.');
                        } catch {
                            toast.error('Could not copy channel link to clipboard.');
                        }
                    }}>
                        Copy Link
                    </ContextMenuItem>


                    <ContextMenuSeparator />
                    <ContextMenuItem disabled={!canManageChannels} onSelect={() => onEditChannel?.(channel)}>
                        Edit Channel
                    </ContextMenuItem>
                    <ContextMenuItem disabled={!canManageChannels} onSelect={() => handleDeleteChannel(channel)} className="text-red-500 hover:bg-red-600/20">
                        Delete Channel
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={async () => {
                        try {
                            await navigator.clipboard.writeText(String(channel.channel_id));
                            toast.success('Channel ID copied to clipboard.');
                        } catch {
                            toast.error('Could not copy channel ID to clipboard.');
                        }
                    }}>
                        Copy Channel ID
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        </div>
    );
};

const GuildSidebarHeader = ({ guildName = '', guild, onOpenServerSettings, canOpenServerSettings }) => {
    const navigate = useNavigate();

    const [menuOpen, setMenuOpen] = useState(false);
    const [inviteInfo, setInviteInfo] = useState(null);
    const [loadingInvite, setLoadingInvite] = useState(false);
    const [error, setError] = useState(null);
    const [leaving, setLeaving] = useState(false);

    const containerRef = useRef(null);

    useEffect(() => {
        if (!menuOpen) return;
        const onDown = (e) => {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(e.target)) setMenuOpen(false);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') setMenuOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [menuOpen]);

    const handleInvite = useCallback(
        async (e) => {
            e.stopPropagation();
            if (!guild?.id || loadingInvite) return;
            setLoadingInvite(true);
            setError(null);
            try {
                const res = await api.post(`guilds/${guild.id}/invites`);
                setInviteInfo(res.data);
                toast.success('Invite created.');
            } catch (err) {
                const msg = err.response?.data?.message || err.message || 'Unknown error';
                setError(msg);
                toast.error(msg);
            } finally {
                setLoadingInvite(false);
            }
        },
        [guild?.id, loadingInvite]
    );

    const handleLeave = useCallback(
        async (e) => {
            e.stopPropagation();
            if (!guild?.id || leaving) return;

            setLeaving(true);
            setError(null);

            try {
                await api.delete(`@me/guilds/${guild.id}/`);
                toast.success('Left server.');
                setMenuOpen(false);
                setInviteInfo(null);
                navigate('/channels/@me');
                await GuildsService.loadGuilds();
            } catch (err) {
                const msg = err.response?.data?.message || err.message || 'Unknown error';
                setError(msg);
                toast.error(msg);
            } finally {
                setLeaving(false);
            }
        },
        [guild?.id, leaving, navigate]
    );

    const handleCopyInvite = useCallback(async () => {
        if (!inviteInfo?.code) return;
        try {
            await navigator.clipboard.writeText(inviteInfo.code);
            toast.success('Copied invite code.');
        } catch {
            toast.error('Could not copy to clipboard.');
        }
    }, [inviteInfo?.code]);

    return (
        <div className="relative w-full" ref={containerRef}>
            <button
                type="button"
                className="w-full cursor-pointer px-4 py-3 text-left transition-colors duration-100 hover:bg-gray-700"
                onClick={() => setMenuOpen((open) => !open)}
            >
                <div className="flex h-6 items-center">
                    <div className="flex-1 truncate text-base font-semibold">{guildName}</div>
                    <CaretDown className={`size-5 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {menuOpen && (
                <div className="absolute inset-x-2 top-12 z-10 rounded bg-gray-700 py-2 shadow-lg">
                    <button
                        type="button"
                        className="block w-full px-4 py-2 text-left text-sm text-gray-100 hover:bg-gray-600 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-gray-700"
                        onClick={() => {
                            setMenuOpen(false);
                            onOpenServerSettings?.();
                        }}
                        disabled={!canOpenServerSettings}
                        aria-disabled={!canOpenServerSettings}
                        title={!canOpenServerSettings ? 'Only the server owner can open settings.' : undefined}
                    >
                        Server Settings
                    </button>

                    <button
                        type="button"
                        className="block w-full px-4 py-2 text-left text-sm text-gray-100 hover:bg-gray-600 disabled:opacity-60"
                        onClick={handleInvite}
                        disabled={loadingInvite}
                    >
                        {loadingInvite ? 'Creating Invite…' : 'Invite People'}
                    </button>

                    <button
                        type="button"
                        className="block w-full px-4 py-2 text-left text-sm text-red-300 hover:bg-gray-600 disabled:opacity-60"
                        onClick={handleLeave}
                        disabled={leaving}
                    >
                        {leaving ? 'Leaving…' : 'Leave Server'}
                    </button>
                </div>
            )}

            {inviteInfo && (
                <div className="absolute inset-x-2 top-28 z-20 rounded border border-gray-700 bg-gray-800 p-4 shadow-lg">
                    <div className="mb-2 text-sm font-semibold text-gray-100">Invite Created</div>
                    <div className="mb-2 flex items-center gap-2">
                        <span className="break-all font-mono text-xs text-gray-300">{inviteInfo.code}</span>
                        <button
                            type="button"
                            className="rounded border border-gray-600 bg-gray-700 px-2 py-1 text-xs text-gray-100 hover:bg-gray-600"
                            onClick={handleCopyInvite}
                        >
                            Copy
                        </button>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            className="rounded bg-gray-700 px-3 py-1 text-xs text-gray-100 hover:bg-gray-600"
                            onClick={() => setInviteInfo(null)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {error && !inviteInfo && (
                <div className="absolute inset-x-2 top-28 z-20 rounded border border-red-700 bg-red-800 p-4 shadow-lg">
                    <div className="mb-2 text-sm font-semibold text-red-100">Error</div>
                    <div className="mb-2 break-all text-xs text-red-200">{error}</div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            className="rounded bg-red-700 px-3 py-1 text-xs text-red-100 hover:bg-red-600"
                            onClick={() => setError(null)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const GuildSidebarCategory = ({
    category,
    channels,
    activeChannelId,
    openCreateChannelDialog,
    guild,
    onEditChannel,
    canManageChannels,
}) => {
    const [expanded, setExpanded] = useState(true);
    const navigate = useNavigate();
    const sectionName = category?.name;
    const { channelUnreads, channelUnreadsLoaded } = useUnreadsStore();

    // Local state for optimistic sorting updates
    const [sortedChannels, setSortedChannels] = useState([]);

    // Filter and sort initially based on props
    useEffect(() => {
        const filtered = [...(channels || [])]
            .filter((c) => c.type === 0)
            .filter((c) => c.parent_id == category?.channel_id)
            .sort((a, b) => {
                const aPos = Number(a.position ?? 0);
                const bPos = Number(b.position ?? 0);
                if (aPos === bPos) {
                    return String(a.name || a.channel_name || '').localeCompare(String(b.name || b.channel_name || ''));
                }
                return aPos - bPos;
            });
        setSortedChannels(filtered);
    }, [channels, category?.channel_id]);

    const isChannelUnread = (channel) => {
        if (!channel || !channelUnreadsLoaded || !channel.last_message_id) return false;

        const channelUnread = channelUnreads.find((cu) => String(cu.channel_id) === String(channel.channel_id));
        if (!channelUnread) return true;

        const channelLastMessageTimestamp = BigInt(channel.last_message_id) >> 22n;
        const channelUnreadLastReadTimestamp = BigInt(channelUnread.last_read_message_id) >> 22n;

        return channelLastMessageTimestamp > channelUnreadLastReadTimestamp;
    };

    // Function to get the amount of mentions in a channel
    const getMentionsCount = useCallback((channel) => {
        const channelUnread = channelUnreads.find((cu) => String(cu.channel_id) === String(channel.channel_id));
        if (!channelUnread) return 0;

        const mentionedMessageIds = channelUnread.mentioned_message_ids || [];
        return mentionedMessageIds.length;
    }, [channelUnreads]);

    const handleDeleteChannel = useCallback(async (channel) => {
        if (!canManageChannels) {
            toast.error('Only the server owner can manage channels.');
            return;
        }
        if (!guild?.id || !channel) return;
        // If this is a category, make sure that we don't allow deletion if it has child channels
        if (channel.type === 3) {
            const childChannels = channels.filter(c => c.parent_id === channel.channel_id);
            if (childChannels.length > 0) {
                toast.error('Cannot delete category with existing channels. Please delete its channels first.');
                return;
            }
        }
        const confirmDelete = window.confirm('Delete this channel?');
        if (!confirmDelete) return;
        // GuildsService.deleteGuildChannel(guild.id, channel.channel_id)
        ChannelsService.deleteGuildChannel(guild.id, channel.channel_id);
    }, [canManageChannels, guild?.id]);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Requires 8px movement before drag starts (prevents blocking clicks)
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event) => {
        const { active, over } = event;

        if (!over || active.id === over.id || !canManageChannels) {
            return;
        }

        setSortedChannels((items) => {
            const oldIndex = items.findIndex((c) => c.channel_id === active.id);
            const newIndex = items.findIndex((c) => c.channel_id === over.id);

            const newItems = arrayMove(items, oldIndex, newIndex);

            // Trigger API Update
            // Map the new order to an array of updates: { id, position }
            // This is optimistic UI: we update state immediately, then call API.
            const updates = newItems.map((item, index) => ({
                id: item.channel_id,
                position: index,
                parent_id: category?.channel_id
            }));

            // NOTE: You will need to implement a batch update endpoint or loop through single updates.
            // Assuming a batch update exists or using single updates for now:
            api.patch(`/guilds/${guild.id}/channels`, updates)
                .catch(err => {
                    console.error("Failed to reorder channels", err);
                    toast.error("Failed to save channel order");
                    // Revert logic could go here
                });

            return newItems;
        });
    };

    return (
        <div className="flex w-full flex-col">
            {category && (
                <ContextMenu>
                    <ContextMenuTrigger>
                        <div className="mb-1 flex items-center pt-4 text-gray-400 hover:text-gray-100">
                            <button
                                type="button"
                                className="flex flex-auto items-center"
                                onClick={() => setExpanded(!expanded)}
                                aria-expanded={expanded}
                            >
                                <div className="flex w-6 items-center justify-center">
                                    {expanded ? <CaretDown className="size-2" /> : <CaretRight className="size-2" />}
                                </div>
                                <span className="text-xs font-bold uppercase">{sectionName}</span>
                            </button>

                            {canManageChannels && (
                                <button type="button" onClick={openCreateChannelDialog} aria-label="Create channel">
                                    <Plus className="mr-2 size-3 text-gray-400" />
                                </button>
                            )}
                        </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-52">
                        <ContextMenuItem onSelect={() => handleDeleteChannel(category)} className="text-red-500 hover:bg-red-600/20">
                            Delete Category
                        </ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>
            )}

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={sortedChannels.map(c => c.channel_id)}
                    strategy={verticalListSortingStrategy}
                >
                    {sortedChannels.map((channel) => {
                        const isUnread = isChannelUnread(channel);
                        const isActive = channel.channel_id == activeChannelId;
                        const mentionsCount = getMentionsCount(channel);

                        return (
                            <SortableChannel
                                key={channel.channel_id}
                                channel={channel}
                                isActive={isActive}
                                isUnread={isUnread}
                                mentionsCount={mentionsCount}
                                expanded={expanded}
                                canManageChannels={canManageChannels}
                                onEditChannel={onEditChannel}
                                handleDeleteChannel={handleDeleteChannel}
                                navigate={navigate}
                            />
                        );
                    })}
                </SortableContext>
            </DndContext>
        </div>
    );
};

const GuildSidebar = ({
    guild,
    onOpenServerSettings,
    onEditChannel,
    canOpenServerSettings,
    canManageChannels,
}) => {
    const { channelId } = useParams();
    const [isCreateChannelDialogOpen, setIsCreateChannelDialogOpen] = useState(false);
    const [isCreateCategoryDialogOpen, setIsCreateCategoryDialogOpen] = useState(false);
    const [categoryId, setCategoryId] = useState(null);
    const { channels } = useChannelsStore();

    const guildChannels = useMemo(() => {
        return (channels || []).filter((c) => String(c.guild_id) === String(guild?.id));
    }, [channels, guild?.id]);

    // Go through all categories (channels with type 3) and render their channels inside them
    const categories = (guildChannels || []).filter((c) => c.type === 3);

    // Also find channels with NO category (root level) to pass to first section
    const rootChannels = (guildChannels || []).filter(c => !c.parent_id && c.type !== 3);

    const onCreateChannel = useCallback(() => {
        setCategoryId(null);
        setIsCreateChannelDialogOpen(true);
    }, []);

    const onCreateCategory = useCallback(() => {
        setIsCreateCategoryDialogOpen(true);
    }, []);

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger>
                    <div className="relative top-0 flex h-full min-w-[240px] flex-col bg-gray-800 text-gray-100">
                        <div className="flex flex-1 flex-col items-center overflow-y-auto">
                            <GuildSidebarHeader
                                guildName={guild?.name}
                                guild={guild}
                                onOpenServerSettings={onOpenServerSettings}
                                canOpenServerSettings={canOpenServerSettings}
                            />
                            <hr className="m-0 w-full border border-gray-900 bg-gray-900 p-0" />

                            {/* Root Channels (No Category) */}
                            <GuildSidebarCategory
                                category={null}
                                channels={guildChannels} // Passing all, section filters
                                activeChannelId={channelId}
                                openCreateChannelDialog={() => { setIsCreateChannelDialogOpen(true); setCategoryId(null); }}
                                guild={guild}
                                onEditChannel={onEditChannel}
                                canManageChannels={canManageChannels}
                            />

                            {categories.map((category) => (
                                <GuildSidebarCategory
                                    key={category.channel_id || category.id}
                                    category={category}
                                    channels={guildChannels}
                                    activeChannelId={channelId}
                                    openCreateChannelDialog={() => {
                                        setIsCreateChannelDialogOpen(true);
                                        setCategoryId(category.channel_id);
                                    }}
                                    guild={guild}
                                    onEditChannel={onEditChannel}
                                    canManageChannels={canManageChannels}
                                />
                            ))}
                        </div>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-52">
                    {canManageChannels && (
                        <ContextMenuItem onSelect={onCreateChannel}>
                            Create Channel
                        </ContextMenuItem>
                    )}
                    {canManageChannels && (
                        <ContextMenuItem onSelect={onCreateCategory}>
                            Create Category
                        </ContextMenuItem>
                    )}
                </ContextMenuContent>
            </ContextMenu>
            <CreateGuildChannelDialog
                isOpen={isCreateChannelDialogOpen}
                setIsOpen={setIsCreateChannelDialogOpen}
                guild={guild}
                categoryId={categoryId}
            />
            <CreateGuildCategoryDialog
                isOpen={isCreateCategoryDialogOpen}
                setIsOpen={setIsCreateCategoryDialogOpen}
                guild={guild}
            />
        </>
    );
};

export default GuildSidebar;