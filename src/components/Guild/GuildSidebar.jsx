
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Hash, Plus, CaretDown, CaretRight } from '@phosphor-icons/react';
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
import { useUnreadsStore } from '@/store/unreads.store';
import { UnreadsService } from '@/services/unreads.service';
import { ChannelsService } from '@/services/channels.service';
import { useChannelsStore } from '@/store/channels.store';
import CreateGuildCategoryDialog from '@/components/Guild/CreateGuildCategoryDialog';
import GuildSidebarHeader from './GuildSidebarHeader';

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

    const handleMarkAsRead = async () => {
        await UnreadsService.setLastReadMessageId(channel.channel_id, channel.last_message_id || null);
        await ChannelsService.acknowledgeChannelMessage(channel.channel_id, channel.last_message_id || null);
        toast.success('Channel marked as read.');
    };

    const handleCopyLink = async () => {
        const channelLink = `${window.location.origin}/channels/${channel.guild_id}/${channel.channel_id}`;
        try {
            await navigator.clipboard.writeText(channelLink);
            toast.success('Channel link copied to clipboard.');
        } catch {
            toast.error('Could not copy channel link to clipboard.');
        }
    };

    const handleCopyId = async () => {
        try {
            await navigator.clipboard.writeText(String(channel.channel_id));
            toast.success('Channel ID copied to clipboard.');
        } catch {
            toast.error('Could not copy channel ID to clipboard.');
        }
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
                        {/* Unread indicator bar */}
                        {isUnread && !isActive && (
                            <div className="absolute left-0 top-1/2 h-2 w-1 -translate-y-1/2 rounded-r-full bg-white" />
                        )}

                        <div
                            className={`relative mx-2 my-0.5 flex cursor-pointer items-center rounded px-2 py-1 transition-colors ${
                                isActive
                                    ? 'bg-gray-600 text-gray-100'
                                    : isUnread
                                        ? 'text-gray-100 hover:bg-gray-700'
                                        : 'text-gray-500 hover:bg-gray-700 hover:text-gray-400'
                            }`}
                        >
                            <Hash className={`size-5 shrink-0 ${isActive || isUnread ? 'text-gray-200' : 'text-gray-500 group-hover:text-gray-400'}`} />

                            <p className={`ml-1 flex-1 truncate text-base select-none ${isActive || isUnread ? 'font-semibold text-white' : 'font-medium'}`}>
                                {channel.name}
                            </p>

                            {/* Mention badge - Discord style */}
                            {mentionsCount > 0 && (
                                <div className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white shadow-sm">
                                    {mentionsCount}
                                </div>
                            )}
                        </div>
                    </Link>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-52">
                    <ContextMenuItem disabled={!isUnread} onSelect={handleMarkAsRead}>
                        Mark as Read
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => navigate(`/channels/${channel.guild_id}/${channel.channel_id}`)}>
                        Go to Channel
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={handleCopyLink}>
                        Copy Link
                    </ContextMenuItem>

                    {canManageChannels && (
                        <>
                            <ContextMenuSeparator />
                            <ContextMenuItem onSelect={() => onEditChannel?.(channel)}>
                                Edit Channel
                            </ContextMenuItem>
                            <ContextMenuItem onSelect={() => handleDeleteChannel(channel)} className="text-red-500 hover:bg-red-600/20">
                                Delete Channel
                            </ContextMenuItem>
                        </>
                    )}

                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={handleCopyId}>
                        Copy Channel ID
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
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

    // Check if channel has unread messages
    const isChannelUnread = useCallback((channel) => {
        if (!channel || !channelUnreadsLoaded || !channel.last_message_id) return false;

        const channelUnread = channelUnreads.find((cu) => String(cu.channel_id) === String(channel.channel_id));
        if (!channelUnread) return true;

        const channelLastMessageTimestamp = BigInt(channel.last_message_id) >> 22n;
        const channelUnreadLastReadTimestamp = BigInt(channelUnread.last_read_message_id) >> 22n;

        return channelLastMessageTimestamp > channelUnreadLastReadTimestamp;
    }, [channelUnreads, channelUnreadsLoaded]);

    // Get mention count from channelUnreads
    const getMentionsCount = useCallback((channel) => {
        if (!channelUnreadsLoaded) return 0;

        const channelUnread = channelUnreads.find((cu) => String(cu.channel_id) === String(channel.channel_id));
        return channelUnread?.mentioned_message_ids?.length || 0;
    }, [channelUnreads, channelUnreadsLoaded]);

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
                .then(() => {
                    toast.success('Channel order updated.');
                })
                .catch(err => {
                    console.error("Failed to reorder channels", err);
                    toast.error("Failed to save channel order");
                });

            return newItems;
        });
    };

    const markChannelsAsRead = useCallback(async () => {
        const unreadChannels = sortedChannels.filter(isChannelUnread);
        await Promise.all(
            unreadChannels.map(async (channel) => {
                await UnreadsService.setLastReadMessageId(channel.channel_id, channel.last_message_id || null);
                await ChannelsService.acknowledgeChannelMessage(channel.channel_id, channel.last_message_id || null);
            })
        );
        toast.success('Channels marked as read.');
    }, [sortedChannels, isChannelUnread]);

    const anyChannelUnread = useMemo(() => {
        return sortedChannels.some(isChannelUnread);
    }, [sortedChannels, isChannelUnread]);

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
                        <ContextMenuItem
                            disabled={!anyChannelUnread}
                            onSelect={markChannelsAsRead}>
                            Mark as Read
                        </ContextMenuItem>

                        {canManageChannels && (
                            <ContextMenuItem onSelect={() => handleDeleteChannel(category)} className="text-red-500 hover:bg-red-600/20">
                                Delete Category
                            </ContextMenuItem>
                        )}
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