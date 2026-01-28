import { useState, useEffect, useRef } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import useStore from './hooks/useStore';
import api from './api';
import PageTitle from './components/PageTitle';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import DirectMessagesPage from './pages/DirectMessages';
import GuildChannelPage from './pages/GuildChannel';
import DiscordGuildChannelPage from './pages/DiscordGuildChannel';
import { GuildsService } from './services/guilds.service';
import { FriendsService } from './services/friends.service';
import axios from 'axios';
import { useGuildsStore } from './stores/guilds.store';
import { useChannelsStore } from './stores/channels.store';
import notificationSound from './sounds/notification.wav'
import { UnreadsService } from './services/unreads.service';
import { RolesService } from './services/roles.service';
import { ChannelsService } from './services/channels.service';

const AuthRoute = ({ children }) => {
  const store = useStore();

  const [initialized, setInitialized] = useState(false);

  // Get guilds from the store
  const { guilds } = useGuildsStore();

  // Get channels from the store
  const { channels } = useChannelsStore();

  // Keep track of active subscriptions to avoid duplicates
  const activeSubscriptions = useRef(new Set());

  useEffect(() => {
    const initialize = async () => {
      try {
        const localToken = localStorage.getItem('token');
        if (localToken) {
          const { data: user } = await api.get('@me', {
            headers: { Authorization: `Bearer ${localToken}` }
          });

          if (user?.username) {
            store.login(user, localToken);

            const localDiscordToken = localStorage.getItem('discord_token');

            if (localDiscordToken) {
              const { data: discordUser } = await axios.get('https://discord.com/api/users/@me', {
                headers: { Authorization: `${localDiscordToken}` }
              });
              if (discordUser?.id) {
                store.setDiscordUser(discordUser);
                store.setDiscordToken(localDiscordToken);

                console.log('Discord user loaded from token.', discordUser);
              }
            }

            await GuildsService.loadGuilds();
            await RolesService.initializeGuildRoles();
            await FriendsService.loadFriends();
            await FriendsService.loadRequests();
            await ChannelsService.loadChannels();
            UnreadsService.loadUnreads();

            // Subsribe to the user private channel via Echo
            console.log(`Subscribing to private.user.${user.id}`);

            window.Echo.private(`user.${user.id}`)
              .listen('.friendrequest.created', (event) => {
                console.log('Received friend request event:', event);
                FriendsService.loadRequests();
              })
              .listen('.friendrequest.deleted', (event) => {
                console.log('Friend request deleted event:', event);
                FriendsService.loadRequests();
              })
              .listen('.friendrequest.accepted', (event) => {
                console.log('Friend request accepted event:', event);
                FriendsService.loadFriends();
                FriendsService.loadRequests();
              })
              .listen('.unread.updated', (event) => {
                console.log('Unread updated event:', event);
                UnreadsService.updateUnread(event.unread.channel_id, event.unread);
              })
              .listen('.message.created', ChannelsService.handleMessageCreated)
              .listen('.message.updated', ChannelsService.handleMessageUpdated)
              .listen('.message.deleted', ChannelsService.handleMessageDeleted);
          } else {
            localStorage.removeItem('token');
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setInitialized(true);
      }
    };

    if (!initialized) {
      initialize();
    }
  }, [initialized]);

  // Subscribe to all channels via Echo
  useEffect(() => {
    if (!initialized || !store.user) return;

    // channels.forEach((channel) => {
    //   const channelId = channel.channel_id;

    //   // Only subscribe if we haven't already
    //   if (!activeSubscriptions.current.has(channelId)) {
    //     console.log(`Subscribing to new channel_: ${channelId}`);

    //     window.Echo.private(`channel.${channelId}`)
    //       .listen('.message.created', (event) => {
    //         const { channels, setChannels, channelMessages, channelPendingMessages, setChannelMessages, setChannelPendingMessages } = useChannelsStore.getState();

    //         console.log('New message event received on channel', channelId, event);

    //         if (channelPendingMessages[channelId]?.some((m) => m.nonce === event.message.nonce)) {
    //           setChannelPendingMessages(channelId, channelPendingMessages[channelId].filter((m) => m.nonce !== event.message.nonce));
    //         }

    //         if (channelMessages[channelId] && !channelMessages[channelId]?.some((m) => m.id === event.message.id)) {
    //           setChannelMessages(channelId, [...(channelMessages[channelId] || []), event.message]);
    //         }

    //         /**
    //          * Update last_message_id for the channel
    //          */
    //         const newChannels = channels.map((c) =>
    //           c.channel_id === channelId ? { ...c, last_message_id: event.message.id } : c
    //         );
    //         console.log('Updating channel last_message_id:', newChannels.find(c => c.channel_id === channelId));
    //         setChannels(newChannels);

    //         /**
    //          * Play notification sound for incoming messages not sent by the current user
    //          */
    //         if (event.message.author.id !== store.user.id) {
    //           new Audio(notificationSound).play().catch((err) => {
    //             console.log('Failed to play notification sound.', err);
    //           });
    //         }
    //       })
    //       .listen('.message.updated', (event) => {
    //         const { channelMessages, setChannelMessages } = useChannelsStore.getState();
    //         if (channelMessages[channelId]?.some((m) => m.id === event.message.id)) {
    //           setChannelMessages(channelId, channelMessages[channelId].map((m) =>
    //             m.id === event.message.id ? { ...m, content: event.message.content, updated_at: event.message.updated_at } : m
    //           ));
    //         }
    //       })
    //       .listen('.message.deleted', (event) => {
    //         const { channels, setChannels, channelMessages, setChannelMessages } = useChannelsStore.getState();

    //         if (channelMessages[channelId]) {
    //           const filtered = channelMessages[channelId].filter((m) => m.id !== event.message.id);
    //           setChannelMessages(channelId, filtered);

    //           const latest = [...filtered].sort((a, b) => b.id - a.id)[0];

    //           // Update last_message_id for the channel
    //           const newChannels = channels.map((c) =>
    //             c.id === channelId ? { ...c, last_message_id: latest?.id || null } : c
    //           );
    //           setChannels(newChannels);
    //         }
    //       });

    //     // Mark as subscribed
    //     activeSubscriptions.current.add(channelId);
    //   }
    // });

    // Subscribe to all guilds via Echo
    guilds.forEach((guild) => {
      const guildId = guild.id;

      // Only subscribe if we haven't already
      if (!activeSubscriptions.current.has(guildId)) {
        console.log(`Subscribing to new guild: ${guildId}`);

        window.Echo.private(`guild.${guildId}`)
          .listen('.member.joined', (event) => {
            GuildsService.addGuildMemberToStore(guildId, event.member);
          })
          .listen('.member.updated', (event) => {
            GuildsService.updateGuildMemberInStore(guildId, event.member.user_id, event.member);
          })
          .listen('.member.left', (event) => {
            GuildsService.deleteGuildMemberFromStore(guildId, event.member.user_id);
          })
          .listen('.message.created', ChannelsService.handleMessageCreated)
          .listen('.message.updated', ChannelsService.handleMessageUpdated)
          .listen('.message.deleted', ChannelsService.handleMessageDeleted)
          .listen('.role.created', RolesService.handleRoleCreated)
          .listen('.role.updated', RolesService.handleRoleUpdated)
          .listen('.role.deleted', RolesService.handleRoleDeleted);

        // Mark as subscribed
        activeSubscriptions.current.add(guildId);
      }
    });

    return () => {
      // Logic to leave Echo channels if needed
    };
  }, [guilds, channels, initialized, store.user]);

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-body">
        <div className="size-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!store.user) {
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
};

const GuestRoute = ({ children }) => {
  if (localStorage.getItem('token')) {
    return <Navigate to="/channels/@me" replace />;
  }

  return children ? children : <Outlet />;
};

function App() {
  const store = useStore();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    // eslint-disable-next-line no-undef
    if (process.env.NODE_ENV === 'development') return;

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return <Routes>
    <Route
      index
      element={
        store.user ? <Navigate to="/channels/@me" replace /> : <Navigate to="/login" replace />
      }
    />
    <Route element={<GuestRoute />}>
      <Route
        path="login"
        element={
          <>
            <PageTitle title="Login" />
            <LoginPage />
          </>
        }
      />
      <Route
        path="register"
        element={
          <>
            <PageTitle title="Register" />
            <RegisterPage />
          </>
        }
      />
    </Route>
    <Route element={<AuthRoute />}>
      <Route
        path="/channels/@me"
        element={
          <>
            <PageTitle title="Direct Messages" />
            <DirectMessagesPage />
          </>
        }
      />
      <Route
        path="/channels/@me/:channelId"
        element={
          <>
            <PageTitle title="Direct Messages" />
            <DirectMessagesPage />
          </>
        }
      />
      <Route
        path="/channels/:guildId/:channelId?"
        element={
          <>
            <PageTitle title="Guild Channel" />
            <GuildChannelPage />
          </>
        }
      />
      <Route
        path="/channels_discord/:guildId/:channelId?"
        element={
          <>
            <PageTitle title="Discord Guild Channel" />
            <DiscordGuildChannelPage isDiscordGuild={true} />
          </>
        }
      />
    </Route>
  </Routes>;
}

export default App;
