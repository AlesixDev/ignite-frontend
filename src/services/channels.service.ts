import { toast } from 'sonner';
import { useChannelsStore } from '../stores/channels.store';
import { useGuildsStore } from '../stores/guilds.store';
import api from '../api.js';
import axios from 'axios';
import useStore from '../hooks/useStore';

export const ChannelsService = {
    /**
     * Load DM/Group channels for the current user, Initialize guild channels from guilds store, and update the local store. 
     * 
     * @returns void
     */
    async loadChannels() {
        const { setChannels } = useChannelsStore.getState();
        const { guilds } = useGuildsStore.getState();

        try {
            const { data } = await api.get('/@me/channels');
            const mergedChannels = [
                ...data,
                ...guilds.flatMap((g) => g.channels || [])
            ];
    
            setChannels(mergedChannels);
        } catch {
            toast.error('Unable to load channels.');
        }
    },

    /**
     * Create a new DM/Group channel with specified recipients IDs and update the local store.
     * 
     * @param recipientsIds Array of user IDs to create a channel with
     * @returns The created channel data
     */
    async createChannel(recipientsIds: string[]) {
        try {
            const { data } = await api.post('@me/channels', { recipients: recipientsIds });

            // Update local store
            const { channels, setChannels } = useChannelsStore.getState();
            setChannels([...channels, data]);

            return data;
        } catch {
            toast.error('Failed to create DM');
        }
    },

    async sendChannelMessage(channelId: string, content: string) {
        const { setChannelPendingMessages, channelPendingMessages } = useChannelsStore.getState();

        const generatedNonce = Date.now().toString() + Math.floor(Math.random() * 1000).toString();

        const pendingMessage = {
            nonce: generatedNonce,
            content: content,
            author: {
                id: useStore.getState().user.id,
                name: useStore.getState().user.name ?? useStore.getState().user.username,
                username: useStore.getState().user.username,
            },
            created_at: new Date().toISOString(),
        };

        setChannelPendingMessages(channelId, [...(channelPendingMessages[channelId] || []), pendingMessage]);

        // api.post(`/channels/${channelId}/messages`, {
        //     content: content,
        //     nonce: generatedNonce,
        //     reply_to: replyingId
        // }).then((response) => {
        //     setPendingMessages((pendingMessages) => pendingMessages.filter((m) => m.nonce !== generatedNonce));
        //     setMessages((messages) => {
        //         if (messages.some((m) => m.nonce === generatedNonce)) {
        //             return messages;
        //         }
        //         return [...messages, response.data];
        //     });
        // });

        try {
            await api.post(`/channels/${channelId}/messages`, {
                content: content,
                nonce: generatedNonce
            });
        } catch {
            // Remove from pending messages
            setChannelPendingMessages(channelId, (channelPendingMessages[channelId] || []).filter(msg => msg.nonce !== pendingMessage.nonce));
            toast.error('Unable to send message.');
        }
    },

    async loadChannelMessages(channelId: string, beforeId: string | null = null) {
        const { channelMessages, setChannelMessages } = useChannelsStore.getState();
        try {
            const { data } = await api.get(`/channels/${channelId}/messages`, {
                params: {
                    before: beforeId,
                    limit: 50,
                }
            });

            const mergedChannelMessages = [...channelMessages[channelId] || [], ...data];
            const newChannelMessages = Array.from(
                new Map(
                    mergedChannelMessages.map((msg: any) => [(msg.id ?? msg.nonce), msg])
                ).values()
            );

            setChannelMessages(channelId, newChannelMessages);
        } catch {
            toast.error('Unable to load channel messages.');
        }
    },

    async acknowledgeChannelMessage(channelId: string, messageId: string) {
        try {
            await api.put(`/channels/${channelId}/ack/${messageId}`);
        } catch {
            toast.error('Unable to acknowledge channel messages.');
        }
    }
};