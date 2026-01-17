import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Hash, Plus, CaretDown, CaretRight, NotePencil, Trash } from '@phosphor-icons/react';
import { toast } from 'react-toastify';
import BaseAuthLayout from './BaseAuthLayout';
import CreateGuildChannelDialog from '../components/CreateGuildChannelDialog';
import ServerSettings from '../components/Settings/ServerSettings';
import UserSettings from '../components/Settings/UserSettings';
import api from '../api';
import useStore from '../hooks/useStore';
import { GuildsService } from '../services/guilds.service';
import { ContextMenu, ContextMenuShortcut, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from '../components/ui/context-menu';
import EditGuildChannelModal from '../components/Modals/EditGuildChannelModal';

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
        window.location.reload();
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

const GuildSidebarSection = ({
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

  const handleDeleteChannel = useCallback(
    async (channel, event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!canManageChannels) {
        toast.error('Only the server owner can manage channels.');
        return;
      }
      if (!guild?.id || !channel) return;

      const confirmDelete = window.confirm('Delete this channel?');
      if (!confirmDelete) return;

      try {
        await api.delete(`/guilds/${guild.id}/channels/${channel.channel_id || channel.id}`);
        const nextChannels = channels.filter(
          (item) => (item.channel_id || item.id) !== (channel.channel_id || channel.id)
        );
        GuildsService.editGuild(guild.id, { channels: nextChannels });
        if (String(channel.channel_id) === String(activeChannelId)) {
          navigate(`/channels/${guild.id}`);
        }
        toast.success('Channel deleted.');
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Could not delete channel.';
        toast.error(msg);
      }
    },
    [activeChannelId, canManageChannels, channels, guild?.id, navigate]
  );

  const sortedChannels = [...(channels || [])]
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

  return (
    <div className="flex w-full flex-col">
      {category && (
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
      )}

      {sortedChannels.map((channel) => (
        <Link
          key={channel.channel_id}
          to={`/channels/${channel.guild_id}/${channel.channel_id}`}
          className={`${!expanded && channel.channel_id != activeChannelId ? 'hidden' : ''}`}
        >
          <div
            className={`group relative mx-2 my-0.5 flex cursor-pointer items-center rounded px-2 py-1 pr-16 ${channel.channel_id == activeChannelId
              ? 'bg-gray-600 text-gray-100'
              : 'text-gray-500 hover:bg-gray-700 hover:text-gray-400'
              }`}
          >
            <Hash className="size-6 text-gray-500" />
            <p className="ml-1 truncate text-base font-medium">{channel.name}</p>
            {canManageChannels && (
              <div className="absolute right-2 hidden items-center gap-1 rounded bg-gray-800/80 px-1 py-0.5 group-hover:flex">
                <button
                  type="button"
                  aria-label={`Edit ${channel.name}`}
                  className="rounded p-1 text-sm text-white/90 hover:bg-primary/10 hover:text-primary"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onEditChannel?.(channel);
                  }}
                >
                  <NotePencil className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${channel.name}`}
                  className="rounded p-1 text-sm text-white/90 hover:bg-primary/10 hover:text-primary"
                  onClick={(event) => handleDeleteChannel(channel, event)}
                >
                  <Trash className="size-4" />
                </button>
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
};

const GuildSidebar = ({
  guild,
  onOpenServerSettings,
  onEditChannel,
  onOpenUserSettings,
  canOpenServerSettings,
  canManageChannels,
}) => {
  const { channelId } = useParams();
  const [isCreateChannelDialogOpen, setIsCreateChannelDialogOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(null);

  // Go through all categories (channels with type 3) and render their channels inside them
  const categories = (guild?.channels || []).filter((c) => c.type === 3);

  const onCreateChannel = useCallback(() => {
    setCategoryId(null);
    setIsCreateChannelDialogOpen(true);
  }, []);

  const onCreateCategory = useCallback(() => {
    toast.info('Create Category clicked.');
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
              <GuildSidebarSection
                category={null}
                channels={guild?.channels || []}
                activeChannelId={channelId}
                openCreateChannelDialog={() => { setIsCreateChannelDialogOpen(true); setCategoryId(null); }}
                guild={guild}
                onEditChannel={onEditChannel}
                canManageChannels={canManageChannels}
              />

              {categories.map((category) => (
                <>
                  <GuildSidebarSection
                    category={category}
                    channels={guild?.channels || []}
                    activeChannelId={channelId}
                    openCreateChannelDialog={() => { setIsCreateChannelDialogOpen(true); setCategoryId(category.channel_id); }}
                    guild={guild}
                    onEditChannel={onEditChannel}
                    canManageChannels={canManageChannels}
                  />
                </>
              ))}
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          <ContextMenuItem onSelect={onCreateChannel}>
            Create Channel
          </ContextMenuItem>
          <ContextMenuItem onSelect={onCreateCategory}>
            Create Category
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {canManageChannels && (
        <CreateGuildChannelDialog
          isOpen={isCreateChannelDialogOpen}
          setIsOpen={setIsCreateChannelDialogOpen}
          guild={guild}
          categoryId={categoryId}
        />
      )}
    </>
  );
};

const GuildLayout = ({ children, guild }) => {
  const store = useStore();
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [isEditChannelModalOpen, setIsEditChannelModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('info');
  const [editChannelId, setEditChannelId] = useState(null);
  const isGuildOwner =
    guild?.owner_id != null &&
    store.user?.id != null &&
    String(guild.owner_id) === String(store.user.id);

  const openServerSettings = useCallback(
    ({ tab = 'info', channelId = null } = {}) => {
      if (!isGuildOwner) {
        toast.error('Only the server owner can open server settings.');
        return;
      }
      setSettingsTab(tab);
      setEditChannelId(channelId);
      setIsServerSettingsOpen(true);
    },
    [isGuildOwner]
  );

  const openEditChannelModal = useCallback(
    ({ channelId = null } = {}) => {
      if (!isGuildOwner) {
        toast.error('Only the server owner can edit channels.');
        return;
      }
      setEditChannelId(channelId);
      setIsEditChannelModalOpen(true);
    },
    [isGuildOwner]
  );

  return (
    <BaseAuthLayout>
      <div className="flex h-screen w-screen">
        <div
          className={`inset-y-0 left-0 w-64 shrink-0 transition-transform duration-300 ease-out translate-x-0`}
        >
          <GuildSidebar
            guild={guild}
            onOpenServerSettings={() => openServerSettings({ tab: 'info', channelId: null })}
            onOpenUserSettings={() => setIsUserSettingsOpen(true)}
            onEditChannel={(channel) => {
              openEditChannelModal({ channelId: channel.channel_id || channel.id });
            }}
            canOpenServerSettings={isGuildOwner}
            canManageChannels={isGuildOwner}
          />
        </div>
        <main className="relative flex min-w-0 flex-1 flex-col bg-gray-700">
          {children}
        </main>
      </div>
      <ServerSettings
        isOpen={isServerSettingsOpen}
        onClose={() => setIsServerSettingsOpen(false)}
        guild={guild}
        initialTab={settingsTab}
        editChannelId={editChannelId}
        onEditChannelChange={setEditChannelId}
      />
      <UserSettings isOpen={isUserSettingsOpen} onClose={() => setIsUserSettingsOpen(false)} />
      <EditGuildChannelModal
        isOpen={isEditChannelModalOpen}
        setIsOpen={setIsEditChannelModalOpen}
        guild={guild}
        onClose={() => setIsEditChannelModalOpen(false)}
        channel={guild?.channels?.find((c) => String(c.channel_id || c.id) === String(editChannelId))}
      />
    </BaseAuthLayout>
  );
};

export default GuildLayout;

