import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useStore from '../../hooks/useStore';
import GuildLayout from '../../layouts/GuildLayout';
import Channel from '../../components/Channel';

const GuildChannelPage = () => {
  const store = useStore();
  const { navigate } = useNavigate();

  // get the guild id from the URL
  const { guildId } = useParams();

  // find guild from store.guilds
  const guild = useMemo(() => store.guilds.find((g) => g.id == guildId), [store.guilds, guildId]);

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
