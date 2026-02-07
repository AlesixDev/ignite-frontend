import Avatar from '@/components/Avatar';

const DMChannelItem = ({ channel, isActive, onClick, channelUnreads, channelUnreadsLoaded, channelsRaw }) => {

    // Logic to determine if a channel is unread
    const isUnread = () => {
        if (!channelUnreadsLoaded) return false;
        const channelUnread = channelUnreads.find((cu) => String(cu.channel_id) === String(channel.channel_id));
        if (!channelUnread) return false;

        const originalChannel = channelsRaw.find((c) => String(c.channel_id) == String(channel.channel_id));
        if (!originalChannel || !originalChannel.last_message_id) return false;

        const lastMsgTime = BigInt(originalChannel.last_message_id) >> 22n;
        const lastReadTime = BigInt(channelUnread.last_read_message_id) >> 22n;

        return lastMsgTime > lastReadTime;
    };

    const unreadState = isUnread();

    return (
        <button
            onClick={onClick}
            className={`
        group relative flex w-full items-center gap-3 rounded px-2 py-1.5 text-sm transition-all
        ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'}
        ${!isActive && unreadState ? 'text-gray-100' : ''} 
      `}
        >
            {!isActive && unreadState && (
                <div className="absolute left-0 top-1/2 h-2 w-1 -translate-y-1/2 rounded-r-full bg-white transition-all group-hover:h-4" />
            )}

            <div className="relative">
                <Avatar user={channel.user} className="size-8 rounded-full" />
                {/* Placeholder for real online status logic */}
                <div className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-gray-800 bg-green-500" />
            </div>

            <span className={`truncate ${!isActive && unreadState ? 'font-bold text-gray-100' : 'font-medium'}`}>
                {channel.user.name}
            </span>
        </button>
    );
};

export default DMChannelItem;