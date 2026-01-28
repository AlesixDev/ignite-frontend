import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GuildsService } from '../services/guilds.service';
import { useGuildsStore } from '../stores/guilds.store';
import DiscordGuildLayout from '../layouts/DiscordGuildLayout';
import DiscordChannel from '../components/DiscordChannel';
import { ChannelContextProvider } from '../contexts/ChannelContext';
import ChannelDialog from '../components/Channel/ChannelDialog';
import { GuildContextProvider } from '../contexts/GuildContext';

const DiscordGuildChannelPage = () => {
  const navigate = useNavigate();

  const { discordGuilds } = useGuildsStore();

  // get the guild id from the URL
  const { guildId, channelId } = useParams();

  // find guild from guilds
  const guild = useMemo(() => discordGuilds.find((g) => g.id == guildId), [discordGuilds, guildId]);

  // if no guild redirect away
  useEffect(() => {
    if (!guild) {
      navigate('/channels/@me', { replace: true });
    }
  }, [guild, navigate]);

  useEffect(() => {
    if (guild && !guild.channels) {
      GuildsService.loadDiscordGuildChannels(guild.id);
    }
  }, [guild]);

  // if no channel id in url redirect to first channel
  useEffect(() => {
    if (guild?.channels && !channelId) {
      const firstTextChannel = guild.channels.find((c) => c.type === 0);
      if (firstTextChannel) {
        navigate(`/channels_discord/${guild.id}/${BigInt(firstTextChannel.id)}`, { replace: true });
      }
    }
  }, [channelId, guild, navigate]);

  useEffect(() => {
    console.log('Guild channels updated:', guild?.channels);
  }, [guild?.channels]);

  const channel = useMemo(() => guild?.channels?.find((c) => c.id == channelId), [guild, channelId]);

  console.log('Selected channel:', channel);

  const [isChannelDialogOpen, setIsChannelDialogOpen] = useState(false);

  return (
    <GuildContextProvider>
      <DiscordGuildLayout guild={guild}>
        <ChannelContextProvider>
          <DiscordChannel channel={channel} />
        </ChannelContextProvider>

        <ChannelDialog isOpen={isChannelDialogOpen} setIsOpen={setIsChannelDialogOpen} guild={guild} />
      </DiscordGuildLayout>
    </GuildContextProvider>
  );
};

export default DiscordGuildChannelPage;
