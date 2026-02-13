import { useState, useCallback } from 'react';
import { NotePencil, Trash, Smiley, ArrowBendUpLeft } from '@phosphor-icons/react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { EmojiPicker, EmojiPickerSearch, EmojiPickerContent, EmojiPickerFooter } from '../ui/emoji-picker';
import { ChannelsService } from '@/services/channels.service';

const MessageActions = ({ message, channelId, canEdit, canDelete, onEdit, onDelete, onReply }) => {
    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

    const handleAddReaction = useCallback((selectedEmoji) => {
        if (!message.id || !channelId) return;
        ChannelsService.toggleMessageReaction(channelId, message.id, selectedEmoji.emoji);
    }, [message.id, channelId]);

    return (
        <div className={`absolute -top-4 right-4 rounded-md border border-gray-800 bg-gray-700 z-40 ${emojiPickerOpen ? 'flex' : 'hidden group-hover:flex'}`}>
            <button type="button" onClick={onReply} className="rounded-md p-2 text-sm text-white/90 hover:bg-primary/10 hover:text-primary">
                <ArrowBendUpLeft className="size-5" />
            </button>

            <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                <PopoverTrigger asChild>
                    <button type="button" className="rounded-md p-2 text-sm text-white/90 hover:bg-primary/10 hover:text-primary">
                        <Smiley className="size-5" />
                    </button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="end" sideOffset={8} avoidCollisions={false} className="p-0 w-[350px] h-[400px] flex flex-col overflow-hidden z-50">
                    <EmojiPicker onEmojiSelect={handleAddReaction}>
                        <EmojiPickerSearch />
                        <EmojiPickerContent />
                        <EmojiPickerFooter />
                    </EmojiPicker>
                </PopoverContent>
            </Popover>

            {canEdit && (
                <button type="button" onClick={onEdit} className="rounded-md p-2 text-sm text-white/90 hover:bg-primary/10 hover:text-primary">
                    <NotePencil className="size-5" />
                </button>
            )}

            {canDelete && (
                <button type="button" onClick={onDelete} className="rounded-md p-2 text-sm text-white/90 hover:bg-primary/10 hover:text-primary">
                    <Trash className="size-5" />
                </button>
            )}
        </div>
    );
};

export default MessageActions;
