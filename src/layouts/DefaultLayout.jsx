import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Fire, Plus } from '@phosphor-icons/react';
import { useGuildsStore } from '../stores/guilds.store';
import GuildDialog from '../components/GuildDialog';
import UserBar from '../components/UserBar';
import { useUnreadsStore } from '../stores/unreads.store';
import { useChannelsStore } from '../stores/channels.store';
import useStore from '../hooks/useStore';
import Avatar from '../components/Avatar';
import { GuildContextProvider } from '@/contexts/GuildContext';

const SidebarIcon = ({ icon = '', iconUrl = '', isActive = false, isServerIcon = false, text = 'tooltip', isUnread = false }) => (
  <div className="group relative mb-2 min-w-min px-3">
    <div
      className={`
        absolute -left-1 top-1/2 block w-2 -translate-y-1/2 rounded-lg bg-white transition-all duration-200 
        ${isActive
          ? 'h-10' // Active: Full height (40px)
          : `group-hover:h-5 ${isUnread ? 'h-2' : 'h-0'}` // Inactive: Hover = Medium (20px), Base = Small (8px) if unread, else hidden
        }
      `}
    ></div>

    <div className={`relative mx-auto flex size-12 cursor-pointer items-center justify-center overflow-hidden transition-all duration-300 ease-out hover:rounded-xl hover:bg-gray-600/60 hover:text-white ${isActive ? 'rounded-xl bg-gray-600/60 text-white' : 'rounded-3xl bg-gray-700 text-gray-100'} ${!isServerIcon ? 'text-green-500 hover:bg-green-500 hover:text-white' : ''}`}>
      {icon ? (
        icon
      ) : iconUrl ? (
        <img src={iconUrl} alt={text} className="size-full object-cover" />
      ) : (
        <span className="text-xl leading-none text-gray-400">{text.slice(0, 2)}</span>
      )}

      {/* Tooltip */}
      <span className="pointer-events-none absolute left-14 m-2 w-auto min-w-max origin-left scale-0 rounded-md bg-gray-900 p-2 text-sm font-bold text-white shadow-lg transition-all duration-100 group-hover:scale-100 z-50">
        {text}
      </span>
    </div>
  </div>
);

const Sidebar = () => {
  const { guildId, channelId } = useParams();
  const { user } = useStore();
  const { guilds } = useGuildsStore();
  const { channelUnreads, channelUnreadsLoaded } = useUnreadsStore();
  const { channels } = useChannelsStore();
  const [isGuildDialogOpen, setIsGuildDialogOpen] = useState(false);

  const isChannelUnread = (channel) => {
    if (!channel || !channelUnreadsLoaded || !channel.last_message_id) return false;

    const channelUnread = channelUnreads.find((cu) => String(cu.channel_id) === String(channel.channel_id));
    if (!channelUnread) return true;

    const channelLastMessageTimestamp = BigInt(channel.last_message_id) >> 22n;
    const channelUnreadLastReadTimestamp = BigInt(channelUnread.last_read_message_id) >> 22n;

    return channelLastMessageTimestamp > channelUnreadLastReadTimestamp;
  };

  const isGuildUnread = (guild) => {
    const guildChannels = guild.channels || [];
    for (const channel of guildChannels) {
      if (channel.type === 0 && isChannelUnread(channel)) {
        return true;
      }
    }
    return false;
  };

  // Get a list of actual DM Channel Objects that are unread
  const unreadDmChannels = useMemo(() => {
    if (!channelUnreadsLoaded || !user) return [];

    return channels
      .filter((c) => c.type === 1 && isChannelUnread(c))
      .map(channel => {
        // Resolve the "other" user for avatar/name display
        const otherUser = (channel.recipients || []).find(r => r.id !== user.id) || channel.user || { username: 'Unknown' };
        return { ...channel, otherUser };
      });
  }, [channelUnreadsLoaded, channels, channelUnreads, user]);

  return (
    <>
      <div className="relative left-0 top-0 m-0 flex h-screen min-w-min flex-col items-center bg-gray-900 pt-3 text-white shadow scrollbar-none overflow-y-auto border-r border-gray-800">

        {/* Main Home / Friends Button */}
        <Link to="/channels/@me">
          <SidebarIcon
            icon={<Fire className="size-6" />}
            text="Friends"
            isServerIcon={true}
            isActive={guildId === '@me' && !channelId} // Active only on dashboard, not inside a specific DM
          />
        </Link>

        {/* List of Unread DMs */}
        {unreadDmChannels.map((dm) => (
          <Link key={dm.channel_id} to={`/channels/@me/${dm.channel_id}`}>
            <SidebarIcon
              // render Avatar as the icon
              icon={<Avatar user={dm.otherUser} className="size-full" />}
              text={dm.otherUser.username}
              isServerIcon={true}
              isActive={channelId === dm.channel_id}
              isUnread={true} // It's in this list because it is unread
            />
          </Link>
        ))}

        <hr className="mx-auto mb-2 mt-2 w-8 rounded-full border-2 border-gray-800 bg-gray-800" />

        {/* Guilds List */}
        {guilds.map((guild) => (
          <Link key={guild.id} to={`/channels/${guild.id}`}>
            <SidebarIcon
              iconUrl={guild.icon || ''}
              text={guild.name}
              isServerIcon={true}
              isActive={guildId === guild.id}
              isUnread={isGuildUnread(guild)}
            />
          </Link>
        ))}

        <button type="button" onClick={() => setIsGuildDialogOpen(true)}>
          <SidebarIcon icon={<Plus className="size-6" />} text="Add a Server" />
        </button>
      </div>
      <GuildDialog isOpen={isGuildDialogOpen} setIsOpen={setIsGuildDialogOpen} />
    </>
  );
};

const DefaultLayout = ({ children }) => {
  return (
    <GuildContextProvider>
      <div className="flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex overflow-hidden">
          {children}
        </div>
        <UserBar />
      </div >
    </GuildContextProvider>
  );
};

export default DefaultLayout;