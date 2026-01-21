import { toast } from 'sonner'
import { useGuildsStore } from '../stores/guilds.store';
import api from '../api.js';
import useStore from '../hooks/useStore';
import axios from 'axios';

export const GuildsService = {
  async loadGuilds() {
    const { setGuilds, setDiscordGuilds } = useGuildsStore.getState();
    try {
      const { data } = await api.get('/guilds');
      setGuilds(data);
    } catch {
      toast.error('Unable to load guilds.');
    }

    const store = useStore.getState();
    console.log(store.discordToken);
    if (store.discordToken && useGuildsStore.getState().discordGuilds.length === 0) {
      console.log("Loading Discord guilds...");
      try {
        const { data } = await axios.get('https://discord.com/api/v9/users/@me/guilds', {
          headers: {
            Authorization: `${store.discordToken}`,
          },
        });

        setDiscordGuilds(data);
      } catch (error: any) {
        if (
          error.response &&
          error.response.status === 429 &&
          error.response.data?.retry_after
        ) {
          const retryAfter = error.response.data.retry_after;
          await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
          try {
            const { data } = await axios.get('https://discord.com/api/v9/users/@me/guilds', {
              headers: {
                Authorization: `${store.discordToken}`,
              },
            });
            setDiscordGuilds(data);
            return;
          } catch {
            // fall through to error toast
          }
        }
        toast.error('Unable to load Discord guilds.');
      }
    }
  },

  async loadGuildMembers(guildId) {
    const { setGuildMembers } = useGuildsStore.getState();
    try {
      const { data } = await api.get(`/guilds/${guildId}/members`);
      setGuildMembers(guildId, data);
    } catch {
      toast.error('Unable to load guild members.');
    }
  },

  async loadGuildChannels(guildId) {
    const { editGuild } = useGuildsStore.getState();
    try {
      const { data } = await api.get(`/guilds/${guildId}/channels`);
      editGuild(guildId, { channels: data });
    } catch {
      toast.error('Unable to load guild channels.');
    }
  },

  async loadDiscordGuildChannels(guildId) {
    const { editDiscordGuild } = useGuildsStore.getState();
    const store = useStore.getState();
    try {
      const { data } = await axios.get(`https://discord.com/api/v9/guilds/${guildId}/channels`, {
        headers: {
          Authorization: `${store.discordToken}`,
        },
      });
      editDiscordGuild(guildId, { channels: data });
    } catch (error) {
      console.error(error);
      toast.error('Unable to load Discord guild channels.');
      return [];
    }
  },

  async createGuild(guildData) {
    const { addGuild } = useGuildsStore.getState();
    try {
      const { data } = await api.post('/guilds', guildData);
      addGuild(data);
      toast.success('Server created successfully.');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'An error occurred.');
    }
  },

  async createGuildChannel(guildId, channelData) {
    const { editGuild, guilds } = useGuildsStore.getState();
    try {
      const response = await api.post(`/guilds/${guildId}/channels`, channelData);
      const guild = guilds.find((g) => g.id === guildId);
      editGuild(guildId, { channels: [...guild.channels, response.data] });
      toast.success('Channel created successfully.');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'An error occurred.');
    }
  },

  async deleteGuildChannel(guildId, channelId) {
    const { editGuild, guilds } = useGuildsStore.getState();
    try {
      await api.delete(`/guilds/${guildId}/channels/${channelId}`);
      const guild = guilds.find((g) => g.id === guildId);
      editGuild(guildId, { channels: guild.channels.filter((c) => c.channel_id !== channelId) });
      toast.success('Channel deleted successfully.');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'An error occurred.');
    }
  }
};
