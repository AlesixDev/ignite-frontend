import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Hash, Plus, CaretDown, CaretRight } from '@phosphor-icons/react';
import BaseAuthLayout from './BaseAuthLayout';
import UserBar from '../components/UserBar';
import CreateGuildChannelDialog from '../components/CreateGuildChannelDialog';
import api from '../api';

const GuildSidebarHeader = ({ guildName = '', guild }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInvite = async (e) => {
    e.stopPropagation();
    if (!guild?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`guilds/${guild.id}/invites`);
      setInviteInfo(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full">
      <div
        className="w-full cursor-pointer px-4 py-3 transition-colors duration-100 hover:bg-gray-700"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <div className="flex h-6 items-center">
          <div className="flex-1 truncate text-base font-semibold">
            {guildName}
          </div>
          <CaretDown className={`size-5 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>
      {menuOpen && (
        <div className="absolute left-2 right-2 top-12 z-10 rounded bg-gray-700 py-2 shadow-lg">
          <button className="block w-full px-4 py-2 text-left text-sm text-gray-100 hover:bg-gray-600">Server Settings</button>
          <button
            className="block w-full px-4 py-2 text-left text-sm text-gray-100 hover:bg-gray-600"
            onClick={handleInvite}
            disabled={loading}
          >
            {loading ? 'Creating Invite...' : 'Invite People'}
          </button>
          <button className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-600">Leave Server</button>
        </div>
      )}
      {inviteInfo && (
        <div className="absolute left-2 right-2 top-28 z-20 rounded bg-gray-800 p-4 shadow-lg border border-gray-700">
          <div className="mb-2 text-sm text-gray-100 font-semibold">Invite Created!</div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs text-gray-300 break-all font-mono">{inviteInfo.code}</span>
            <button
              className="rounded bg-gray-700 px-2 py-1 text-xs text-gray-100 hover:bg-gray-600 border border-gray-600"
              onClick={() => {
                navigator.clipboard.writeText(inviteInfo.code);
              }}
            >
              Copy
            </button>
          </div>
          <button className="mt-2 rounded bg-gray-700 px-3 py-1 text-xs text-gray-100 hover:bg-gray-600" onClick={() => setInviteInfo(null)}>Close</button>
        </div>
      )}
      {error && (
        <div className="absolute left-2 right-2 top-28 z-20 rounded bg-red-800 p-4 shadow-lg border border-red-700">
          <div className="mb-2 text-sm text-red-100 font-semibold">Error</div>
          <div className="mb-2 text-xs text-red-200 break-all">{error}</div>
          <button className="mt-2 rounded bg-red-700 px-3 py-1 text-xs text-red-100 hover:bg-red-600" onClick={() => setError(null)}>Close</button>
        </div>
      )}
    </div>
  );
};
  
const GuildSidebarSection = ({ sectionName = 'Text Channels', channels, activeChannelId, setIsCreateChannelDialogOpen }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="flex w-full flex-col">
      <div className="mb-1 flex cursor-pointer items-center pt-4 text-gray-400 hover:text-gray-100">
        <div className="flex flex-auto items-center" onClick={() => setExpanded(!expanded)}>
          <div className="flex w-6 items-center justify-center">
            {expanded ? <CaretDown className="size-2" /> : <CaretRight className="size-2" />}
          </div>
          <span className="text-xs font-bold uppercase">{sectionName}</span>
        </div>
        <button type="button" onClick={() => setIsCreateChannelDialogOpen(true)}>
          <Plus className="mr-2 size-3 text-gray-400" />
        </button>
      </div>
      {channels &&
        channels.map((channel) => (
          <Link key={channel.id} to={`/channels/${channel.guild_id}/${channel.channel_id}`} className={`${!expanded && channel.channel_id != activeChannelId ? 'hidden' : ''}`}>
            <div className={`mx-2 my-0.5 flex cursor-pointer items-center rounded px-2 py-1 ${channel.channel_id == activeChannelId ? 'bg-gray-600 text-gray-100' : 'text-gray-500 hover:bg-gray-700 hover:text-gray-400'}`}>
              <Hash className="size-6 text-gray-500" />
              <p className="ml-1 truncate text-base font-medium">
                {channel.name}
              </p>
            </div>
          </Link>
        ))
      }
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
      <GuildSidebarSection sectionName="Text Channels" channels={guild?.channels || []} activeChannelId={channelId} setIsCreateChannelDialogOpen={setIsCreateChannelDialogOpen} />
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
