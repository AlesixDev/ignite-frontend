import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Fire, Plus } from '@phosphor-icons/react';
import { useGuildsStore } from '../stores/guilds.store';
import GuildDialog from '../components/GuildDialog';
import { useParams } from 'react-router-dom';
import UserBar from '../components/UserBar';
import { useUnreadsStore } from '../stores/unreads.store';

const SidebarIcon = ({ icon = '', iconUrl = '', isActive = false, isServerIcon = false, text = 'tooltip', isUnread = false }) => (
  <div className="group relative mb-2 min-w-min px-3">
    {isUnread && (
      <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-100 z-10"></span>
    )}
    <div className={`absolute -left-1 top-1 h-10 w-2 scale-0 rounded-lg bg-gray-100 transition-all ${!isActive ? 'group-hover:scale-x-100 group-hover:scale-y-50' : 'scale-100'}`}></div>
    <div className={`relative mx-auto flex size-12 cursor-pointer items-center justify-center transition-all duration-300 ease-out hover:rounded-xl hover:bg-gray-600/60 hover:text-white ${isActive ? 'rounded-xl bg-gray-600/60 text-white' : 'rounded-3xl bg-gray-700 text-gray-100'} ${!isServerIcon ? 'text-green-500 hover:bg-green-500 hover:text-white' : ''}`}>
      {icon ? (
        icon
      ) : iconUrl ? (
        <img src={iconUrl} alt={text} className="size-12 rounded-3xl object-cover" />
      ) : (
        <span className="text-xl leading-none text-gray-400">{text.slice(0, 2)}</span>
      )}
      <span className="absolute left-14 m-2 w-auto min-w-max origin-left scale-0 rounded-md bg-gray-900 p-2 text-sm font-bold text-white shadow-lg transition-all duration-100 group-hover:scale-100">
        {text}
      </span>
    </div>
  </div>
);

const Sidebar = () => {
  const { guildId } = useParams();
  const { guilds, discordGuilds } = useGuildsStore();
  const { channelUnreads, channelUnreadsLoaded } = useUnreadsStore();

  const isChannelUnread = (guild, channelId) => {
    if (!channelUnreadsLoaded) return false;

    // Find the channel unread with channel_id == channelId
    const channelUnread = channelUnreads.find((cu) => String(cu.channel_id) === String(channelId));
    if (!channelUnread) return true;

    // If the timestamp of channel.last_message_id is greater than channelUnread.last_read_message_id
    const channel = guild?.channels?.find((c) => String(c.channel_id) === String(channelId));
    if (!channel || !channel.last_message_id) return false;

    // Get timestamp of both message IDs (Snowflake)
    const channelLastMessageTimestamp = BigInt(channel.last_message_id) >> 22n;
    const channelUnreadLastReadTimestamp = BigInt(channelUnread.last_read_message_id) >> 22n;

    return channelLastMessageTimestamp > channelUnreadLastReadTimestamp;
  }

  const [isGuildDialogOpen, setIsGuildDialogOpen] = useState(false);

  const isGuildUnread = (guild) => {
    // Get all text channels for the guild and check if any have unreads
    const guildChannels = guild.channels || [];

    for (const channel of guildChannels) {
      if (channel.type == 0 && isChannelUnread(guild, channel.channel_id)) {
        return true;
      }
    }

    return false;
  }

  return (
    <>
      <div className="relative left-0 top-0 m-0 flex h-screen min-w-min flex-col items-center bg-gray-900 pt-3 text-white shadow">
        <Link to="/channels/@me">
          <SidebarIcon
            icon={<Fire className="size-6" />}
            text="Direct Messages"
            isServerIcon={true}
            isActive={guildId === '@me'}
          />
        </Link>
        <hr className="mx-auto mb-2 w-8 rounded-full border border-gray-800 bg-gray-800" />
        {guilds.map((guild) => (
          <Link key={guild.id} to={`/channels/${guild.id}`}>
            <SidebarIcon
              iconUrl={guild.icon || ''}
              text={guild.name}
              isServerIcon={true}
              isActive={guildId == guild.id}
              isUnread={isGuildUnread(guild)}
            />
          </Link>
        ))}
        {discordGuilds.map((discordGuild) => (
          <Link key={discordGuild.id} to={`/channels_discord/${discordGuild.id}`}>
            <SidebarIcon
              iconUrl={''}
              text={discordGuild.name}
              isServerIcon={true}
              isActive={guildId == discordGuild.id}
            />
          </Link>
        ))}
        <button type="button" onClick={() => setIsGuildDialogOpen(true)}>
          <SidebarIcon icon={<Plus className="size-6" />} text="Add a Server" />
        </button>
        {/* <button type="button">
          <SidebarIcon icon={<Compass className="size-6" />} text="Explore Public Servers" />
        </button> */}
      </div>
      <GuildDialog isOpen={isGuildDialogOpen} setIsOpen={setIsGuildDialogOpen} />
    </>
  );
};

const DefaultLayout = ({ children }) => {
  return (
    <div className="flex">
      <Sidebar />
      {children}
      <UserBar />
    </div>
  );
};

export default DefaultLayout;
