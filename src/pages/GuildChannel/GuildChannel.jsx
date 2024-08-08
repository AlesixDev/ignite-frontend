import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GuildLayout from '../../layouts/GuildLayout';
import Channel from '../../components/Channel';
import useGuildStore from '../../hooks/useGuildStore';

const GuildChannelPage = () => {
  const { guilds } = useGuildStore();
  const { navigate } = useNavigate();

  // get the guild id from the URL
  const { guildId } = useParams();

  // find guild from guilds
  const guild = useMemo(() => guilds.find((g) => g.id == guildId), [guilds, guildId]);

  // if no guild redirect away
  useEffect(() => {
    if (!guild) {
      navigate('/dashboard', { replace: true });
    }
  }, [guild, navigate]);

  return (
    <GuildLayout guild={guild}>
      <Channel channelName={'Channel'} />
    </GuildLayout>
  );
};

export default GuildChannelPage;
