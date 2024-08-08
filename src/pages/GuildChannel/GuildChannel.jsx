import useStore from '../../hooks/useStore';
import GuildLayout from '../../layouts/GuildLayout';
import Channel from '../../components/Channel';

const GuildChannelPage = () => {
  const store = useStore();

  return (
    <GuildLayout>
      <Channel channelName={'Channel'} />
    </GuildLayout>
  );
};

export default GuildChannelPage;
