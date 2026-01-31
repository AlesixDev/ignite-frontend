import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DefaultLayout from '../layouts/DefaultLayout';
import useStore from '../hooks/useStore';
import { GuildContextProvider } from '../contexts/GuildContext';
import { ChannelContextProvider } from '../contexts/ChannelContext';
import Channel from '../components/Channel/Channel';
import UserSettings from '../components/Settings/UserSettings';
import DMSidebar from '../components/dm/DMSidebar';
import FriendsDashboard from '../components/friends/FriendsDashboard';
import { useChannelsStore } from '../stores/channels.store';

const DirectMessagesPage = () => {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const { channels } = useChannelsStore();

  // Determine active view
  const isFriendsView = !channelId || channelId === 'friends';

  // Find active channel object if we aren't in friends view
  const activeChannel = !isFriendsView
    ? channels.find(c => c.channel_id === channelId)
    : null;

  return (
    <GuildContextProvider>
      <DefaultLayout>
        <div className="flex h-screen w-screen overflow-hidden bg-gray-700 text-gray-100 select-none">

          {/* Sidebar Component */}
          <DMSidebar
            activeChannelId={channelId || 'friends'}
            onNavigate={(id) => navigate(`/channels/@me/${id}`)}
          />

          {/* Main Content Area */}
          <main className="relative flex flex-1 flex-col overflow-hidden">
            {isFriendsView ? (
              <FriendsDashboard />
            ) : (
              <ChannelContextProvider>
                {/* normalizeThread logic should ideally happen inside Channel or a hook, 
                     but passing activeChannel directly here works based on your existing code */}
                <Channel channel={activeChannel} />
              </ChannelContextProvider>
            )}
          </main>

        </div>

        <UserSettings
          isOpen={isUserSettingsOpen}
          onClose={() => setIsUserSettingsOpen(false)}
        />
      </DefaultLayout>
    </GuildContextProvider>
  );
};

export default DirectMessagesPage;