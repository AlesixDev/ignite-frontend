import { toast } from 'sonner'
import { useGuildsStore } from '../stores/guilds.store';
import api from '../api.js';
import useStore from '../hooks/useStore';
import axios from 'axios';
import { ChannelsService } from './channels.service';

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
      ChannelsService.initializeGuildChannels(data.id);
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
  },

  /**
   * Add a guild member to the local store
   * 
   * @param guildId The ID of the guild where the member will be added.
   * @param member The member to be added.
   */
  async addGuildMemberToStore(guildId: string, member: any) {
    const { guildMembers, setGuildMembers } = useGuildsStore.getState();
    const members = guildMembers[guildId] || [];
    if (members.length === 0) return;
    
    setGuildMembers(guildId, [...members, member]);
  },

  /**
   * Update a guild member in the local store
   * 
   * @param guildId The ID of the guild where the member exists.
   * @param memberId The ID of the member to be updated.
   * @param updates The updates to be applied to the member.
   */
  async updateGuildMemberInStore(guildId: string, memberId: string, updates: any) {
    const { guildMembers, setGuildMembers } = useGuildsStore.getState();
    const members = guildMembers[guildId] || [];
    if (members.length === 0) return;

    const updatedMembers = members.map(member =>
      member.user_id === memberId ? { ...member, ...updates } : member
    );
    setGuildMembers(guildId, updatedMembers);
  },

  /**
   * Delete a guild member from the local store
   * 
   * @param guildId The ID of the guild where the member exists.
   * @param memberId The ID of the member to be deleted.
   */
  async deleteGuildMemberFromStore(guildId: string, memberId: string) {
    const { guildMembers, setGuildMembers } = useGuildsStore.getState();
    const members = guildMembers[guildId] || [];
    if (members.length === 0) return;

    const updatedMembers = members.filter(member => member.user_id !== memberId);
    setGuildMembers(guildId, updatedMembers);
  }
};
