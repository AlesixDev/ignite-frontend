import { toast } from 'sonner'
import api from '../api.js';
import { useUnreadsStore } from '../stores/unreads.store.js';

export const UnreadsService = {
    async loadUnreads() {
        const { setChannelUnreads } = useUnreadsStore.getState();
        try {
            const { data } = await api.get('/@me/unreads');
            setChannelUnreads(data);

            console.log('Loaded unreads:', data);
        } catch {
            toast.error('Unable to load unread messages.');
        }
    },

    async setLastReadMessageId(channelId: string, messageId: string) {
        const { channelUnreads, setChannelUnreads } = useUnreadsStore.getState();

        // Find or create the channel unread with channel_id = channelId and set the last_read_message_id to messageId
        const exists = channelUnreads.some((unread) => unread.channel_id === channelId);
        let updatedUnreads;
        if (exists) {
            updatedUnreads = channelUnreads.map((unread) => {
                if (unread.channel_id === channelId) {
                    return { ...unread, last_read_message_id: messageId };
                }
                return unread;
            });
        } else {
            updatedUnreads = [
                ...channelUnreads,
                { channel_id: channelId, last_read_message_id: messageId }
            ];
        }
        setChannelUnreads(updatedUnreads);
    }
};
