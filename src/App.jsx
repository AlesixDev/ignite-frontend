import { useState, useEffect } from 'react';
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
              .listen('.friend.requested', (event) => {
                console.log('Received friend request event:', event);
                FriendsService.loadRequests();
              })
              .listen('.friend.accepted', (event) => {
                console.log('Friend request accepted event:', event);
                FriendsService.loadFriends();
                FriendsService.loadRequests();
              })
              .listen('.friend.deleted', (event) => {
                console.log('Friend deleted event:', event);
                FriendsService.loadFriends();
                FriendsService.loadRequests();
              });

            // Subscribe to all channels via Echo
            const guilds = useGuildsStore.getState().guilds;
            guilds.forEach(guild => {
              guild.channels?.forEach(channel => {
                console.log(`Subscribing to channel.${channel.channel_id}`);

                window.Echo.private(`channel.${channel.channel_id}`)
                  .listen('.message.created', (event) => {
                    const { channelMessages, channelPendingMessages, setChannelMessages, setChannelPendingMessages } = useChannelsStore.getState();
                    const { user } = useStore.getState();
                    const { editGuildChannel } = useGuildsStore.getState();

                    /*
                       Remove the message from pendingMessages if it exists then add to channelMessages
                    */
                    if (channelPendingMessages[channel.channel_id]?.some((m) => m.nonce === event.message.nonce)) {
                      console.log('Removing from pending messages');
                      setChannelPendingMessages(channel.channel_id, channelPendingMessages[channel.channel_id].filter((m) => m.nonce !== event.message.nonce));
                    }

                    if (channelMessages[channel.channel_id] && !channelMessages[channel.channel_id]?.some((m) => m.id === event.message.id)) {
                      console.log('Adding to channel messages');

                      console.log(channelMessages[channel.channel_id]);
                      setChannelMessages(channel.channel_id, [...(channelMessages[channel.channel_id] || []), event.message]);

                      if (event.message.author.id !== user.id) {
                        // Play notification sound for incoming message
                        const audio = new Audio(notificationSound);
                        audio.play().catch((e) => {
                          console.error('Failed to play notification sound:', e);
                        });
                      }

                      // Set guild channel last_message_id for unreads
                      editGuildChannel(channel.guild_id, channel.channel_id, { last_message_id: event.message.id });
                    }
                  })
                  .listen('.message.updated', (event) => {
                    const { channelMessages, setChannelMessages } = useChannelsStore.getState();

                    if (channelMessages[channel.channel_id] && channelMessages[channel.channel_id]?.some((m) => m.id === event.message.id)) {
                      console.log('Updating channel messages');

                      // If the message exists in channelMessages, update it
                      setChannelMessages(channel.channel_id, channelMessages[channel.channel_id].map((m) => m.id === event.message.id ? { ...m, content: event.message.content, updated_at: event.message.updated_at } : m));
                      // setChannelMessages(channel.channel_id, channelMessages[channel.channel_id].map((m) => m.id === event.message.id ? { ...m, content: event.message.content, updated_at: event.message.updated_at } : m));
                    }

                    // console.log('message updated');
                    // if (event.channel.id == channel.channel_id) {
                    //   setMessages((prev) => prev.map((m) => m.id === event.message.id ? { ...m, content: event.message.content, updated_at: event.message.updated_at } : m));
                    // }
                  })
                  .listen('.message.deleted', (event) => {
                    // console.log('message deleted');
                    // if (event.channel.id == channel.channel_id) {
                    //   setMessages((prev) => prev.filter((m) => m.id !== event.message.id));
                    // }

                    const { channelMessages, setChannelMessages } = useChannelsStore.getState();
                    const { editGuildChannel } = useGuildsStore.getState();

                    if (channelMessages[channel.channel_id]) {
                      console.log('Deleting from channel messages');

                      // If the message exists in channelMessages, remove it
                      setChannelMessages(channel.channel_id, channelMessages[channel.channel_id].filter((m) => m.id !== event.message.id));

                      const latestMessage = channelMessages[channel.channel_id]
                        .slice()
                        .sort((a, b) => b.id - a.id)[0];

                      // Set guild channel last_message_id for unreads
                      editGuildChannel(channel.guild_id, channel.channel_id, { last_message_id: latestMessage?.id });

                      console.log('Latest message after deletion:', latestMessage);
                    }

                  });
              });
            });
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
