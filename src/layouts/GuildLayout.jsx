import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Hash, Plus, CaretDown, CaretRight } from '@phosphor-icons/react';
import { toast } from 'react-toastify';
import BaseAuthLayout from './BaseAuthLayout';
import UserBar from '../components/UserBar';
import CreateGuildChannelDialog from '../components/CreateGuildChannelDialog';
import api from '../api';

const GuildSidebarHeader = ({ guildName = '', guild }) => {
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
        <div className="absolute left-2 right-2 top-12 z-10 rounded bg-gray-700 py-2 shadow-lg">
          <button
            type="button"
            className="block w-full px-4 py-2 text-left text-sm text-gray-100 hover:bg-gray-600"
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
        <div className="absolute left-2 right-2 top-28 z-20 rounded border border-gray-700 bg-gray-800 p-4 shadow-lg">
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
        <div className="absolute left-2 right-2 top-28 z-20 rounded border border-red-700 bg-red-800 p-4 shadow-lg">
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

const GuildSidebarSection = ({ sectionName = 'Text Channels', channels, activeChannelId, setIsCreateChannelDialogOpen }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="flex w-full flex-col">
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

        <button type="button" onClick={() => setIsCreateChannelDialogOpen(true)} aria-label="Create channel">
          <Plus className="mr-2 size-3 text-gray-400" />
        </button>
      </div>

      {channels?.map((channel) => (
        <Link
          key={channel.channel_id}
          to={`/channels/${channel.guild_id}/${channel.channel_id}`}
          className={`${!expanded && channel.channel_id != activeChannelId ? 'hidden' : ''}`}
        >
          <div
            className={`mx-2 my-0.5 flex cursor-pointer items-center rounded px-2 py-1 ${
              channel.channel_id == activeChannelId
                ? 'bg-gray-600 text-gray-100'
                : 'text-gray-500 hover:bg-gray-700 hover:text-gray-400'
            }`}
          >
            <Hash className="size-6 text-gray-500" />
            <p className="ml-1 truncate text-base font-medium">{channel.name}</p>
          </div>
        </Link>
      ))}
    </div>
  );
};

const GuildSidebar = ({ guild }) => {
  const { channelId } = useParams();
  const [isCreateChannelDialogOpen, setIsCreateChannelDialogOpen] = useState(false);

  return (
    <div className="relative top-0 flex h-full min-w-[240px] flex-col items-center bg-gray-800 text-gray-100">
      <GuildSidebarHeader guildName={guild?.name} guild={guild} />
      <hr className="m-0 w-full border border-gray-900 bg-gray-900 p-0" />
      <GuildSidebarSection
        sectionName="Text Channels"
        channels={guild?.channels || []}
        activeChannelId={channelId}
        setIsCreateChannelDialogOpen={setIsCreateChannelDialogOpen}
      />
      <CreateGuildChannelDialog isOpen={isCreateChannelDialogOpen} setIsOpen={setIsCreateChannelDialogOpen} guild={guild} />
    </div>
  );
};

const GuildLayout = ({ children, guild }) => {
  return (
    <BaseAuthLayout>
      <div className="flex flex-col">
        <GuildSidebar guild={guild} />
        <UserBar />
      </div>
      {children}
    </BaseAuthLayout>
  );
};

export default GuildLayout;
