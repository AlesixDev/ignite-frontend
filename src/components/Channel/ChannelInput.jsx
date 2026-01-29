import { InputGroup } from '../ui/input-group';
import { Textarea } from '../ui/textarea'; // Import shadcn Textarea
import { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from '../ui/emoji-picker';
import { useChannelContext } from '../../contexts/ChannelContext.jsx';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { XCircle } from '@phosphor-icons/react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Smile } from 'lucide-react';
import { ChannelsService } from '../../services/channels.service';
import { ChannelType } from '../../enums/ChannelType';
import useStore from '../../hooks/useStore';

const MAX_MESSAGE_LENGTH = 2000;

const ChannelInput = ({ channel }) => {
    const { messages, setMessages, replyingId, setReplyingId, inputMessage, setInputMessage, inputRef } = useChannelContext();
    const store = useStore();

    const replyMessage = useMemo(() => replyingId ? messages.find((m) => m.id == replyingId) : null, [messages, replyingId]);

    const sendMessage = useCallback(async (event) => {
        if (event) event.preventDefault();

        if (!channel?.channel_id || !inputMessage.trim()) {
            return;
        }
        ChannelsService.sendChannelMessage(channel.channel_id, inputMessage);

        setInputMessage('');
        setReplyingId(null);

        // Reset height immediately after sending
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }
    }, [channel?.channel_id, inputMessage, replyingId, setInputMessage, setMessages, setReplyingId, inputRef]);

    const adjustHeight = useCallback(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
        }
    }, [inputRef]);

    useEffect(() => {
        adjustHeight();
    }, [inputMessage, adjustHeight]);

    const isMobile = () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || window.innerWidth <= 768;
    };

    useEffect(() => {
        if (inputRef.current && !isMobile()) {
            inputRef.current.focus();
        }
    }, [inputRef, channel?.channel_id]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(e);
        }
    };

    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

    const channelName = useMemo(() => {
        if (channel?.name) {
            return channel.name;
        }

        if (channel?.type == ChannelType.DM) {
            const otherUser = channel.recipients?.find((r) => r.id !== store.user.id);
            return otherUser.name;
        }

        return 'unknown-channel';
    }, [channel]);

    return (
        <div className="absolute bottom-0 left-0 right-0 z-20 w-full bg-gray-700/95 px-4 pt-2 backdrop-blur supports-[backdrop-filter]:bg-gray-700/60 pb-4 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {replyingId && (
                <div className="flex items-center justify-between gap-2 rounded-t-md border-b border-b-white/5 bg-gray-800 px-4 py-2 text-sm text-gray-300">
                    <p>Replying to <span className="text-primary">{replyMessage?.author.username}</span></p>
                    <button type="button" onClick={() => setReplyingId(null)} className="text-gray-400 hover:text-gray-200">
                        <XCircle weight="fill" className="size-5" />
                    </button>
                </div>
            )}
            <form onSubmit={(e) => sendMessage(e)} className="w-full">
                <InputGroup className={`relative flex min-h-[48px] h-auto items-end bg-gray-800 pb-1 ${replyingId ? 'rounded-t-none' : ''}`}>
                    <Textarea
                        ref={inputRef}
                        name="message"
                        className="min-h-[44px] w-full resize-none border-0 bg-transparent py-3 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        placeholder={`Message #${channelName}`}
                        value={inputMessage}
                        onChange={(e) => {
                            if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
                                setInputMessage(e.target.value);
                            }
                        }}
                        onKeyDown={handleKeyDown}
                        maxLength={MAX_MESSAGE_LENGTH}
                        rows={1}
                        style={{ maxHeight: '200px' }}
                    />

                    <div className="mb-1 mr-1">
                        <Popover onOpenChange={setIsEmojiPickerOpen} open={isEmojiPickerOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    data-size="xs"
                                    variant="ghost"
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:text-gray-100"
                                >
                                    <Smile className="size-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-fit p-0" side="top" align="end">
                                <EmojiPicker
                                    className="h-[342px]"
                                    onEmojiSelect={({ emoji }) => {
                                        setIsEmojiPickerOpen(false);
                                        setInputMessage((prev) => prev + emoji);
                                        setTimeout(() => inputRef.current?.focus(), 0);
                                    }}
                                >
                                    <EmojiPickerSearch />
                                    <EmojiPickerContent />
                                    <EmojiPickerFooter />
                                </EmojiPicker>
                            </PopoverContent>
                        </Popover>
                    </div>
                </InputGroup>
            </form>
        </div>
    );
};

export default ChannelInput;