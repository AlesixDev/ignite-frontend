import { toast } from 'sonner';
import { useChannelsStore } from '../store/channels.store';
import { useGuildsStore } from '../store/guilds.store';
import api from '../api.js';
import axios from 'axios';
import useStore from '../hooks/useStore';
import notificationSound from '../assets/notification.wav'

export const ChannelsService = {
    /**
     * Initialize channels for a specific guild
     */
    async initializeGuildChannels(guildId: string) {
        const { guilds } = useGuildsStore.getState();
        const { channels, setChannels } = useChannelsStore.getState();
        const guild = guilds.find(g => g.id === guildId);

        if (!guild) {
            toast.error('Guild not found.');
            return;
        }

        const mergedChannels = [
            ...channels,
            ...guild.channels || []
        ];
        setChannels(mergedChannels);
    },

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
    async createPrivateChannel(recipientsIds: string[]) {
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

    /**
     * Create a new guild channel under a specified guild and update the local store.
     * 
     * @param guildId The ID of the guild to create the channel in
     * @param channelData The data for the new channel
     * @returns The created channel data
     */
    async createGuildChannel(guildId: string, channelData: any) {
        try {
            const { data } = await api.post(`/guilds/${guildId}/channels`, channelData);

            // Update local store
            const { channels, setChannels } = useChannelsStore.getState();
            setChannels([...channels, data]);

            return data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const errorMessage = error.response.data?.message || 'Failed to create guild channel';
                toast.error(errorMessage);
            } else {
                toast.error('Failed to create guild channel');
            }
        }
    },

    /**
     * Delete a guild channel by its ID and update the local store.
     * 
     * @param guildId The ID of the guild the channel belongs to
     * @param channelId The ID of the channel to delete
     * @returns void
     */
    async deleteGuildChannel(guildId: string, channelId: string) {
        try {
            await api.delete(`/guilds/${guildId}/channels/${channelId}`);

            // Update local store
            const { channels, setChannels } = useChannelsStore.getState();
            setChannels(channels.filter(channel => channel.channel_id !== channelId));
        } catch {
            toast.error('Failed to delete channel');
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
    },

    /**
     * Callback for the .message.created event from the WebSocket to update the local store with the new message.
     * 
     * @param event The message created event data
     * @return void
     */
    handleMessageCreated(event: any) {
        const { user } = useStore.getState();
        const { channels, setChannels, channelMessages, channelPendingMessages, setChannelMessages, setChannelPendingMessages } = useChannelsStore.getState();
        const channelId = event.channel.id;

        console.log('New message event received on channel', channelId);

        if (channelPendingMessages[channelId]?.some((m) => m.nonce === event.message.nonce)) {
            setChannelPendingMessages(channelId, channelPendingMessages[channelId].filter((m) => m.nonce !== event.message.nonce));
        }

        if (channelMessages[channelId] && !channelMessages[channelId]?.some((m) => m.id === event.message.id)) {
            setChannelMessages(channelId, [...(channelMessages[channelId] || []), event.message]);
        }

        /**
         * Update last_message_id for the channel
         */
        const newChannels = channels.map((c) =>
            c.channel_id === channelId ? { ...c, last_message_id: event.message.id } : c
        );
        console.log('Updating channel last_message_id:', newChannels.find(c => c.channel_id === channelId));
        setChannels(newChannels);

        /**
         * Play notification sound for incoming messages not sent by the current user
         */
        if (event.message.author.id !== user.id) {
            new Audio(notificationSound).play().catch((err) => {
                console.log('Failed to play notification sound.', err);
            });
        }
    },

    /**
     * Callback for the .message.deleted event from the WebSocket to update the local store by removing the deleted message.
     * 
     * @param event The message deleted event data
     * @return void
     */
    handleMessageDeleted(event: any) {
        const { channels, setChannels, channelMessages, setChannelMessages } = useChannelsStore.getState();
        const channelId = event.channel.id;

        if (channelMessages[channelId]) {
            const filtered = channelMessages[channelId].filter((m) => m.id !== event.message.id);
            setChannelMessages(channelId, filtered);

            const latest = [...filtered].sort((a, b) => b.id - a.id)[0];

            // Update last_message_id for the channel
            const newChannels = channels.map((c) =>
                c.id === channelId ? { ...c, last_message_id: latest?.id || null } : c
            );
            setChannels(newChannels);
        }
    },

    /**
     * Callback for the .message.updated event from the WebSocket to update the local store with the updated message data.
     * 
     * @param event The message updated event data
     * @return void
     */
    handleMessageUpdated(event: any) {
        const { channelMessages, setChannelMessages } = useChannelsStore.getState();
        const channelId = event.channel.id;

        if (channelMessages[channelId]?.some((m) => m.id === event.message.id)) {
            setChannelMessages(channelId, channelMessages[channelId].map((m) =>
                m.id === event.message.id ? { ...m, content: event.message.content, updated_at: event.message.updated_at } : m
            ));
        }
    }
};