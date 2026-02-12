import { useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useChannelsStore } from '../../store/channels.store';
import { ChannelsService } from '@/services/channels.service';
import useStore from '../../hooks/useStore';

const MessageReactions = ({ message, channelId }) => {
    const store = useStore();
    const channelReactions = useChannelsStore(s => s.channelReactions);

    const messageReactions = useMemo(() => {
        const reactions = channelReactions[channelId]?.[message.id] || [];
        return reactions.map(reaction => ({
            ...reaction,
            me: reaction.users.includes(store.user.id)
        }));
    }, [channelReactions, channelId, message.id, store.user.id]);

    const handleReactionToggle = useCallback((messageId, emoji) => {
        if (!messageId || !channelId) return;
        ChannelsService.toggleMessageReaction(channelId, messageId, emoji);
    }, [channelId]);

    if (messageReactions.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1 mt-2 -ml-14 pl-14">
            {messageReactions.map((reaction) => (
                <button
                    key={reaction.emoji}
                    type="button"
                    onClick={() => handleReactionToggle(message.id, reaction.emoji)}
                    className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded border text-sm transition-colors",
                        reaction.me
                            ? "bg-primary/20 border-primary/50 hover:bg-primary/30 hover:border-primary/60"
                            : "bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-600"
                    )}
                >
                    <span className="text-base leading-none">{reaction.emoji}</span>
                    <span className="text-xs font-medium text-gray-300">{reaction.count}</span>
                </button>
            ))}
        </div>
    );
};

export default MessageReactions;
