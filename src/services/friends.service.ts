import { toast } from 'react-toastify';
import { useFriendsStore } from '../stores/friends.store';
import api from '../api.js';

export const FriendsService = {
  async loadFriends() {
    const { setFriends } = useFriendsStore.getState();
    try {
      const { data } = await api.get('@me/friends');
      setFriends(data);
    } catch {
      toast.error('Unable to load friends.');
    }
  },

  async loadRequests() {
    const { setRequests } = useFriendsStore.getState();
    try {
      const { data } = await api.get('@me/friends/requests');
      setRequests(data);
    } catch {
      toast.error('Unable to load friend requests.');
    }
  },

  async sendRequest(username: string) {
    if (!username.trim()) {
      toast.error('Enter a username.');
      return;
    }

    try {
      await api.post('@me/friends/requests', null, {
        params: { username },
      });
      await this.loadRequests();
    } catch {
      toast.error('Unable to send friend request.');
    }
  },

  async acceptRequest(id: string) {
    try {
      await api.post(`@me/friends/requests/${id}/accept`);
      await Promise.all([this.loadFriends(), this.loadRequests()]);
    } catch {
      toast.error('Unable to accept friend request.');
    }
  },

  async cancelRequest(id: string) {
    try {
      await api.delete(`@me/friends/requests/${id}`);
      await this.loadRequests();
    } catch {
      toast.error('Unable to cancel friend request.');
    }
  },

  async deleteFriend(id: string) {
    try {
      await api.delete(`@me/friends/${id}`);
      await this.loadFriends();
    } catch {
      toast.error('Unable to delete friend.');
    }
  },
};
