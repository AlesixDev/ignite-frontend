import { toast } from 'react-toastify';
import { useGuildsStore } from '../stores/guilds.store';
import api from '../api.js';

export const GuildsService = {
  async loadGuilds() {
    const { setGuilds } = useGuildsStore.getState();
    try {
      const { data } = await api.get('/guilds');
      setGuilds(data);
    } catch {
      toast.error('Unable to load guilds.');
    }
  },

  async loadGuildMembers(guildId) {
    const { editGuild } = useGuildsStore.getState();
    try {
      const { data } = await api.get(`/guilds/${guildId}/members`);
      editGuild(guildId, { members: data });
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
