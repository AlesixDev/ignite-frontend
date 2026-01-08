import { useEffect, useMemo, useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../api';
import GuildLayout from '../../layouts/GuildLayout';
import Channel from '../../components/Channel';
import useGuildStore from '../../hooks/useGuildStore';
import { ChannelContextProvider } from '../../contexts/ChannelContext';
import ChannelDialog from '../../components/ChannelDialog';

const GuildChannelPage = () => {
  const { guilds, editGuild } = useGuildStore();
  const navigate = useNavigate();

  // get the guild id from the URL
  const { guildId, channelId } = useParams();

  // find guild from guilds
  const guild = useMemo(() => guilds.find((g) => g.id == guildId), [guilds, guildId]);

  // if no guild redirect away
  useEffect(() => {
    if (!guild) {
      navigate('/dashboard', { replace: true });
    }
  }, [guild, navigate]);

  const fetchGuildChannels = useCallback(async () => {
    try {
      const response = await api.get(`/guilds/${guild.id}/channels`);
      editGuild({ ...guild, channels: response.data });
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Could not fetch guild channels.');
    }
  }, [editGuild, guild]);

  useEffect(() => {
    if (guild && !guild.channels) {
      fetchGuildChannels(true);
    }
  }, [fetchGuildChannels, guild]);

  // if no channel id in url redirect to first channel
  useEffect(() => {
    if (guild?.channels && !channelId) {
      navigate(`/channels/${guild.id}/${BigInt(guild.channels[0].channel_id)}`);
    }
  }, [channelId, guild, navigate]);

  const channel = useMemo(() => guild?.channels?.find((c) => c.channel_id == channelId), [guild, channelId]);

  const [isChannelDialogOpen, setIsChannelDialogOpen] = useState(false);

  return (
    <GuildLayout guild={guild}>
      <ChannelContextProvider>
        <Channel channel={channel} />
      </ChannelContextProvider>

      <ChannelDialog isOpen={isChannelDialogOpen} setIsOpen={setIsChannelDialogOpen} guild={guild} />
    </GuildLayout>
  );
};

export default GuildChannelPage;
