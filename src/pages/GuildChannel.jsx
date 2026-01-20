import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GuildsService } from '../services/guilds.service';
import { useGuildsStore } from '../stores/guilds.store';
import GuildLayout from '../layouts/GuildLayout';
import Channel from '../components/Channel';
import { ChannelContextProvider } from '../contexts/ChannelContext';
import ChannelDialog from '../components/ChannelDialog';
import { GuildContextProvider } from '../contexts/GuildContext';

const GuildChannelPage = () => {
  const navigate = useNavigate();

  const { guilds } = useGuildsStore();

  // get the guild id from the URL
  const { guildId, channelId } = useParams();

  // find guild from guilds
  const guild = useMemo(() => guilds.find((g) => g.id == guildId), [guilds, guildId]);

  // if no guild redirect away
  useEffect(() => {
    if (!guild) {
      navigate('/channels/@me', { replace: true });
    }
  }, [guild, navigate]);

  useEffect(() => {
    if (guild && !guild.channels) {
      GuildsService.loadGuildChannels(guild.id);
    }
  }, [guild]);

  // if no channel id in url redirect to first channel
  useEffect(() => {
    if (guild?.channels && !channelId) {
      navigate(`/channels/${guild.id}/${BigInt(guild.channels[0].channel_id)}`, { replace: true });
    }
  }, [channelId, guild, navigate]);

  const channel = useMemo(() => guild?.channels?.find((c) => c.channel_id == channelId), [guild, channelId]);

  const [isChannelDialogOpen, setIsChannelDialogOpen] = useState(false);

  return (
    <GuildContextProvider>
      <GuildLayout guild={guild}>
        <ChannelContextProvider>
          <Channel channel={channel} />
        </ChannelContextProvider>

        <ChannelDialog isOpen={isChannelDialogOpen} setIsOpen={setIsChannelDialogOpen} guild={guild} />
      </GuildLayout>
    </GuildContextProvider>
  );
};

export default GuildChannelPage;
