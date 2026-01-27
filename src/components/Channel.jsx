import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner'
import { NotePencil, Trash, ArrowBendUpLeft, XCircle, PushPin, CaretDown } from '@phosphor-icons/react';
import api from '../api';
import useStore from '../hooks/useStore';
import { GuildsService } from '../services/guilds.service';
import { useGuildsStore } from '../stores/guilds.store';
import { useGuildContext } from '../contexts/GuildContext';
import { useChannelContext } from '../contexts/ChannelContext.jsx';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from './ui/context-menu';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from './ui/input-group';
import { Badge } from './ui/badge';
import ChannelBar from './ChannelBar.jsx';
import GuildMemberContextMenu from './GuildMemberContextMenu';
import GuildMemberPopoverContent from './GuildMemberPopoverContent';
import { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from './ui/emoji-picker';
import { Button } from './ui/button';
import { Smile } from 'lucide-react';
import { useChannelsStore } from '../stores/channels.store';
import { ChannelsService } from '../services/channels.service';
import { UnreadsService } from '../services/unreads.service';
import Avatar from './Avatar.jsx';
import { useRolesStore } from '../stores/roles.store';

const UnreadDivider = () => (
  <div className="flex items-center justify-center mt-6 mb-2 relative group w-full animate-in fade-in duration-300">
    {/* The Red Line */}
    <div className="absolute left-0 right-0 top-1/2 h-px bg-red-500/80 shadow-[0_0_4px_rgba(239,68,68,0.4)]"></div>

    {/* The Badge */}
    <span className="relative z-10 bg-gray-700 px-2 text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1">
      <span>New Messages</span>
      <CaretDown weight="bold" className="size-3" />
    </span>
  </div>
);

const ChannelMessage = ({ message, prevMessage, pending }) => {
  const { guildId } = useGuildContext();
  const store = useStore();
  const guildsStore = useGuildsStore();
  const authorMenuRef = useRef(null);
  const [authorMenuOpen, setAuthorMenuOpen] = useState(false);

  const { messages, setMessages, editingId, setEditingId, setReplyingId, setPinId, inputRef, setInputMessage } = useChannelContext();

  const authorColor = useMemo(() => {
    const members = guildsStore.guildMembers[guildId] || [];
    const member = members.find((m) => m.user_id === message.author.id);

    if (!member || !member.roles || member.roles.length === 0) return 'inherit';

    const sortedRoles = [...member.roles].sort((a, b) => b.position - a.position);
    const topRole = sortedRoles.find(r => r.color && r.color !== 0); // 0 is usually 'default/none'

    return topRole ? `#${topRole.color.toString(16).padStart(6, '0')}` : 'inherit';
  }, [guildId, guildsStore.guildMembers, message.author.id]); 1

  const formattedDateTime = useMemo(() => {
    const date = new Date(message.created_at);

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const day = isToday ? 'Today' : isYesterday ? 'Yesterday' : date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    return `${day} at ${time}`;
  }, [message.created_at]);

  const shouldStack = useMemo(() => {
    if (prevMessage) {
      const sameAuthor = prevMessage.author.id === message.author.id;
      const sameName = prevMessage.author.name === message.author.name;
      const sentWithinMinute = (new Date(message.created_at) - new Date(prevMessage.created_at)) / 1000 < 60;

      return sameAuthor && sameName && sentWithinMinute;
    }
  }, [prevMessage, message]);

  const isEditing = useMemo(() => editingId === message.id, [editingId, message.id]);
  const canEdit = useMemo(() => message.author.id === store.user.id, [message.author.id, store.user.id]);
  const canDelete = useMemo(() => {
    if (message.author.id === store.user.id) return true;

    const activeGuild = guildsStore.guilds.find((g) => g.id == guildId);
    if (activeGuild?.owner_id == store.user.id) return true;

    const activeGuildMembers = guildsStore.guildMembers[guildId] || [];
    const member = activeGuildMembers.find((m) => m.user_id === store.user.id);
    if (!member) return false;

    // bitwise | all permissions in roles
    const allowedPermissions = member?.roles.reduce((acc, role) => {
      return acc | (role ? role.permissions : 0);
    }, 0);

    if (allowedPermissions & 8) { // MANAGE_MESSAGES
      return true;
    }

    return false;
  }, [guildId, guildsStore.guilds, message.author.id, store.user.id]);

  // console.log(store.user);
  // console.log(guildsStore.guilds);

  const [editedMessage, setEditedMessage] = useState(message.content);

  const onEdit = useCallback(async (event) => {
    event.preventDefault();

    if (!editedMessage || editedMessage === message.content) {
      setEditingId(null);
      return;
    }

    try {
      await api.put(`/channels/${message.channel_id}/messages/${message.id}`, { content: editedMessage });
      setMessages(messages.map((m) => m.id === message.id ? { ...m, content: editedMessage, updated_at: new Date().toISOString() } : m));
      setEditingId(null);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Could not edit message.');
    }
  }, [editedMessage, message.content, message.channel_id, message.id, setEditingId, setMessages, messages]);

  const onDelete = useCallback(async () => {
    try {
      await api.delete(`/channels/${message.channel_id}/messages/${message.id}`);
      setMessages(messages.filter((m) => m.id !== message.id));
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Could not delete message.');
    }
  }, [message.channel_id, message.id, messages, setMessages]);

  const onReply = useCallback(() => {
    setReplyingId(message.id);
  }, [message.id, setReplyingId]);

  const onPin = useCallback(async () => {
    try {
      await api.post(`/channels/${message.channel_id}/messages/${message.id}/pin`);
      setPinId(message.id);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Could not pin message.');
    }
    toast.info('Pinning is not available yet.');
  }, [message.channel_id, message.id, setPinId]);

  useEffect(() => {
    if (!authorMenuOpen) return;
    const onDown = (event) => {
      if (!authorMenuRef.current) return;
      if (!authorMenuRef.current.contains(event.target)) {
        setAuthorMenuOpen(false);
      }
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setAuthorMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [authorMenuOpen]);

  // TODO: This is duplicated
  const onMention = useCallback((user) => {
    setInputMessage((prev) => `${prev} @${user.username} `);
    inputRef.current.focus();
  }, [inputRef, setInputMessage]);

  return (
    <Popover>
      <ContextMenu>
        <ContextMenuTrigger className={`group relative block py-1 data-[state=open]:bg-gray-800/60 ${isEditing ? 'bg-gray-800/60' : 'hover:bg-gray-800/60'} ${shouldStack ? '' : 'mt-3.5'}`}>
          <div className="flex items-start px-4 gap-4">
            {shouldStack ? (
              <div className="w-10" />
            ) : (
              <ContextMenu>
                <PopoverTrigger>
                  <ContextMenuTrigger>
                    <Avatar user={message.author} className="size-10" />
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <GuildMemberContextMenu user={message.author} onMention={onMention} />
                  </ContextMenuContent>
                </PopoverTrigger>
              </ContextMenu>
            )}

            <div className="flex flex-1 flex-col items-start justify-start">
              {shouldStack ? null : (
                <div className="relative mb-1 flex justify-start leading-none">
                  <PopoverTrigger>
                    <span
                      className="font-semibold leading-none"
                      style={{ color: authorColor }}
                    >
                      {message?.author.name} {message?.author.is_webhook && <Badge>Webhook</Badge>} {message?.author.is_bot && <Badge>Bot</Badge>}
                    </span>
                  </PopoverTrigger>
                  <p className="ml-2 self-end text-xs font-medium leading-tight text-gray-500">
                    {formattedDateTime}
                  </p>
                </div>
              )}

              {isEditing ? (
                <div className="my-2 w-full">
                  <div className="mb-1 flex items-center rounded-lg bg-gray-600 px-4 py-2">
                    <form onSubmit={(e) => onEdit(e)} className="w-full">
                      <input
                        className="w-full border-0 bg-inherit p-0 text-white outline-none placeholder:text-gray-400 focus:ring-0"
                        type="text"
                        value={editedMessage}
                        onChange={(e) => setEditedMessage(e.target.value)}
                        autoFocus
                      />
                    </form>
                  </div>
                  <p className="text-xs text-gray-400">
                    escape to <button onClick={() => setEditingId(null)} className="text-primary hover:underline">cancel</button> •
                    enter to <button onClick={(e) => onEdit(e)} className="text-primary hover:underline">save</button>
                  </p>
                </div>
              ) : (
                <div
                  className={`text-gray-400 break-words break-all whitespace-pre-wrap ${pending ? 'opacity-50' : ''}`}
                >
                  {message.content}
                  {(message.updated_at && message.created_at !== message.updated_at) && (
                    <span className="ml-1 text-[0.65rem] text-gray-500">(edited)</span>
                  )}
                </div>
              )}
            </div>
          </div>
          {(!isEditing && !pending) && (
            <div className="absolute -top-4 right-4 hidden rounded-md border border-gray-800 bg-gray-700 group-hover:flex">
              <button type="button" onClick={onPin} className="rounded-md p-2 text-sm text-white/90 hover:bg-primary/10 hover:text-primary">
                <PushPin className="size-5" />
              </button>
              {canEdit && (
                <button type="button" onClick={() => setEditingId(message.id)} className="rounded-md p-2 text-sm text-white/90 hover:bg-primary/10 hover:text-primary">
                  <NotePencil className="size-5" />
                </button>
              )}
              {canDelete && (
                <button type="button" onClick={onDelete} className="rounded-md p-2 text-sm text-white/90 hover:bg-primary/10 hover:text-primary">
                  <Trash className="size-5" />
                </button>
              )}
              <button type="button" onClick={onReply} className="rounded-md p-2 text-sm text-white/90 hover:bg-primary/10 hover:text-primary">
                <ArrowBendUpLeft className="size-5" />
              </button>
            </div>
          )}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          <ContextMenuItem>
            Add Reaction
          </ContextMenuItem>
          <ContextMenuSeparator />
          {canEdit && (
            <ContextMenuItem onSelect={() => setEditingId(message.id)}>
              Edit Message
            </ContextMenuItem>
          )}
          <ContextMenuItem onSelect={onReply}>
            Reply
          </ContextMenuItem>
          <ContextMenuItem>
            Forward
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => {
            navigator.clipboard.writeText(message.content);
            toast.success('Message text copied to clipboard.');
          }}>
            Copy Text
          </ContextMenuItem>
          <ContextMenuItem onSelect={onPin}>
            Pin Message
          </ContextMenuItem>
          <ContextMenuItem>
            Mark Unread
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => {
            const link = `${message.id}`;
            navigator.clipboard.writeText(link);
            toast.success('Message link copied to clipboard.');
          }}>
            Copy Message ID
          </ContextMenuItem>
          <ContextMenuItem>
            Speak Message
          </ContextMenuItem>
          {canDelete && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={onDelete} className="text-red-500 hover:bg-red-600/20">
                Delete Message
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      <PopoverContent className="w-auto p-2" align="start" alignOffset={0}>
        <GuildMemberPopoverContent user={message.author} guild={null} />
      </PopoverContent>
    </Popover>
  );
};

const ChannelMessages = ({ channelId, messagesRef, highlightId, onLoadMore, loadingMore, hasMore }) => {
  const { setEditingId, replyingId, setReplyingId } = useChannelContext();
  const { channelMessages, channelPendingMessages } = useChannelsStore();
  const [atTop, setAtTop] = useState(false);

  const pendingMessages = channelPendingMessages[channelId] || [];

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setEditingId(null);
        setReplyingId(null);
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [setEditingId, setReplyingId]);

  const onScroll = useCallback(() => {
    const el = messagesRef.current;
    if (!el) return;
    setAtTop(el.scrollTop <= 10);
  }, [messagesRef]);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    setAtTop(el.scrollTop <= 10);
  }, [messagesRef]);

  const messages = channelMessages[channelId] || [];

  return (
    <div
      className={`min-h-0 flex-1 overflow-y-auto ${replyingId ? ' md:max-h-[calc(100vh-11.5rem)]' : ' md:max-h-[calc(100vh-9rem)]'}`}
      ref={messagesRef}
      onScroll={onScroll}
    >
      {atTop && hasMore && (
        <div className="sticky top-0 z-10 flex justify-center bg-gray-700/80 px-4 py-2 backdrop-blur">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="rounded bg-gray-800 px-3 py-1 text-xs text-gray-200 hover:bg-gray-700 disabled:opacity-60"
          >
            {loadingMore ? 'Loading…' : 'Load history'}
          </button>
        </div>
      )}

      {!hasMore && (
        <div className="px-4 py-2 text-center text-xs text-gray-500">
          Beginning of channel
        </div>
      )}

      {messages && messages.map((message, index) => {
        const prevMessage = messages[index - 1] || null;
        return (
          <div key={message.id} id={`msg-${message.id}`} className={highlightId === message.id ? 'rounded ring-2 ring-primary' : ''}>
            <ChannelMessage message={message} prevMessage={prevMessage} />
          </div>
        );
      })}
      {pendingMessages && pendingMessages.map((message, index) => {
        const prevMessage = pendingMessages[index - 1] || messages[messages.length - 1] || null;
        return (
          <ChannelMessage key={message.nonce} message={message} prevMessage={prevMessage} pending={true} />
        );
      })}
    </div>
  );
};
const MAX_MESSAGE_LENGTH = 2000;

const ChannelInput = ({ channel }) => {
  const { messages, setMessages, replyingId, setReplyingId, inputMessage, setInputMessage, inputRef } = useChannelContext();

  const replyMessage = useMemo(() => replyingId ? messages.find((m) => m.id == replyingId) : null, [messages, replyingId]);

  const sendMessage = useCallback(async (event) => {
    event.preventDefault();

    if (!channel?.channel_id || !inputMessage) {
      return;
    }

    // try {
    //   const generatedNonce = Date.now().toString() + Math.floor(Math.random() * 1000).toString();

    //   setPendingMessages([...pendingMessages, {
    //     nonce: generatedNonce,
    //     content: inputMessage,
    //     author: {
    //       id: useStore.getState().user.id,
    //       name: useStore.getState().user.name ?? useStore.getState().user.username,
    //       username: useStore.getState().user.username,
    //     },
    //     created_at: new Date().toISOString(),
    //   }]);

    //   api.post(`/channels/${channel.channel_id}/messages`, {
    //     content: inputMessage,
    //     nonce: generatedNonce,
    //     reply_to: replyingId
    //   });

    //   setInputMessage('');
    //   setReplyingId(null);
    // } catch (error) {
    //   console.error(error);
    //   toast.error(error.response?.data?.message || 'Could not send message.');
    // }
    ChannelsService.sendChannelMessage(channel.channel_id, inputMessage);

    setInputMessage('');
    setReplyingId(null);
  }, [channel?.channel_id, inputMessage, replyingId, setInputMessage, setMessages, setReplyingId]);

  useEffect(() => {
    // if (replyingId) {
    //   inputRef.current.focus();
    // }
    if (inputRef.current) {
      inputRef.current.select();
    }
  }, [inputRef, channel?.channel_id]);

  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  return (
    <div className="sticky bottom-0 z-10 bg-gray-700/95 p-4 backdrop-blur md:static md:mt-[22px] md:bg-transparent md:pb-0">
      {replyingId && (
        <div className="flex items-center justify-between gap-2 rounded-t-md border-b border-b-white/5 bg-gray-800 px-4 py-2 text-sm text-gray-300">
          <p>Replying to <span className="text-primary">{replyMessage?.author.username}</span></p>
          <button type="button" onClick={() => setReplyingId(null)} className="text-gray-400 hover:text-gray-200">
            <XCircle weight="fill" className="size-5" />
          </button>
        </div>
      )}
      <form onSubmit={(e) => sendMessage(e)} className="w-full">
        <InputGroup className={`h-12 bg-gray-800 ${replyingId ? 'rounded-t-none' : ''}`}>
          <InputGroupInput
            placeholder={`Message #${channel?.name}`}
            value={inputMessage}
            onChange={(e) => {
              if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
                setInputMessage(e.target.value);
              }
            }}
            ref={inputRef}
            maxLength={MAX_MESSAGE_LENGTH}
          />
          <Popover onOpenChange={setIsEmojiPickerOpen} open={isEmojiPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                data-size="xs"
                variant="ghost"
                className="mr-2 flex h-6 items-center gap-1 rounded-[calc(var(--radius)-5px)] px-2 text-sm shadow-none has-[>svg]:px-2 [&>svg:not([class*='size-'])]:size-3.5"
              >
                <Smile className="size-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-fit p-0">
              <EmojiPicker
                className="h-[342px]"
                onEmojiSelect={({ emoji }) => {
                  setIsEmojiPickerOpen(false);
                  setInputMessage((prev) => prev + emoji);
                  inputRef.current.focus();
                }}
              >
                <EmojiPickerSearch />
                <EmojiPickerContent />
                <EmojiPickerFooter />
              </EmojiPicker>
            </PopoverContent>
          </Popover>
        </InputGroup>
      </form>
    </div>
  );
};

const MemberListItem = ({ member, onMention }) => {
  const topColor = useMemo(() => {
    if (!member.roles || member.roles.length === 0) return 'inherit';

    // Sort by position descending (highest position first)
    const sorted = [...member.roles].sort((a, b) => b.position - a.position);

    // Find the first role that has a non-zero color
    const topRole = sorted.find((r) => r.color && r.color !== 0);

    if (!topRole) return 'inherit';

    // Convert integer color to Hex (e.g., 16711680 -> #ff0000)
    return `#${topRole.color.toString(16).padStart(6, '0')}`;
  }, [member.roles]);

  return (
    <Popover>
      <ContextMenu>
        <PopoverTrigger className="w-full text-left">
          <ContextMenuTrigger>
            <div className="flex items-center gap-3 rounded-md p-2 transition hover:bg-gray-700/50">
              <Avatar user={member.user} className="size-8" />
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-medium"
                  style={{ color: topColor }}
                >
                  {member.user.name ?? member.user.username}
                </p>
                <p className="truncate text-xs text-gray-400">
                  {member.user.status}
                </p>
              </div>
            </div>
          </ContextMenuTrigger>
        </PopoverTrigger>
        <ContextMenuContent>
          <GuildMemberContextMenu user={member.user} onMention={onMention} />
        </ContextMenuContent>
      </ContextMenu>
      <PopoverContent className="w-auto p-2" align="start" alignOffset={0}>
        <GuildMemberPopoverContent user={member.user} guild={null} />
      </PopoverContent>
    </Popover>
  );
};

const MemberList = ({ guildId, activeGuildMembers }) => {
  const { memberListOpen, setInputMessage, inputRef } = useChannelContext();
  const [membersByRole, setMembersByRole] = useState({});
  const [membersWithoutRoles, setMembersWithoutRoles] = useState([]);

  const onMention = useCallback((user) => {
    setInputMessage((prev) => `${prev} @${user.username} `);
    inputRef.current.focus();
  }, [inputRef, setInputMessage]);

  const roles = useRolesStore().guildRoles[guildId] || [];

  useEffect(() => {
    const tempMembersByRole = {};
    const tempMembersWithoutRoles = [];
    const assignedMemberIds = new Set();

    activeGuildMembers?.forEach((member) => {
      if (member.roles && member.roles.length > 0) {
        // Map member's role ids to role objects, filter out missing, sort by position
        const firstRole = member.roles.sort((a, b) => b.position - a.position)[0];
        if (firstRole && !assignedMemberIds.has(member.user.id)) {
          if (!tempMembersByRole[firstRole.id]) tempMembersByRole[firstRole.id] = [];
          tempMembersByRole[firstRole.id].push(member);
          assignedMemberIds.add(member.user.id);
        }
      } else {
        tempMembersWithoutRoles.push(member);
      }
    });

    setMembersByRole(tempMembersByRole);
    setMembersWithoutRoles(tempMembersWithoutRoles);
  }, [activeGuildMembers, roles]);

  const renderMember = (member) => {
    // Calculate color based on roles
    const topColor = useMemo(() => {
      if (!member.roles || member.roles.length === 0) return 'inherit';
      const sorted = [...member.roles].sort((a, b) => b.position - a.position);
      const topRole = sorted.find(r => r.color && r.color !== 0);
      return topRole ? `#${topRole.color.toString(16).padStart(6, '0')}` : 'inherit';
    }, [member.roles]);

    return (
      <div key={member.user.id}>
        <Popover>
          <ContextMenu>
            <PopoverTrigger className="w-full">
              <ContextMenuTrigger>
                <div className="flex items-center gap-3 rounded-md p-2 transition hover:bg-gray-700/50">
                  <Avatar user={member.user} className="size-8" />
                  <div>
                    <p className="text-sm font-medium" style={{ color: topColor }}>{member.user.name ?? member.user.username}</p>
                    <p className="text-xs text-gray-400">{member.user.status}</p>
                  </div>
                </div>
              </ContextMenuTrigger>
            </PopoverTrigger>
            <ContextMenuContent>
              <GuildMemberContextMenu user={member.user} onMention={onMention} />
            </ContextMenuContent>
          </ContextMenu>
          <PopoverContent className="w-auto p-2" align="start" alignOffset={0}>
            <GuildMemberPopoverContent user={member.user} guild={null} />
          </PopoverContent>
        </Popover>
      </div>
    )
  };

  return (
    <div className={`relative z-0 transition-all duration-300 ${memberListOpen ? 'w-60 md:w-72' : 'w-0'}`}>
      {memberListOpen && (
        <div className="flex h-full flex-col border-l border-gray-800 bg-gray-800">
          <div className="flex h-12 items-center border-b border-gray-700 px-4 text-sm font-semibold text-gray-300">
            Members
          </div>
          <div className="flex flex-1 flex-col gap-2 p-2 text-gray-400 overflow-y-auto">
            {roles.map((role) =>
              membersByRole[role.id] && membersByRole[role.id].length > 0 ? (
                <div key={role.id}>
                  <div className="px-2 py-1 text-xs font-bold text-gray-400">{role.name} &mdash; {membersByRole[role.id].length}</div>
                  {membersByRole[role.id].map((member) => (
                    <MemberListItem
                      key={member.user.id}
                      member={member}
                      onMention={onMention}
                    />
                  ))}
                </div>
              ) : null
            )}
            {membersWithoutRoles.length > 0 && (
              <div>
                <div className="px-2 py-1 text-xs font-bold text-gray-400">Members &mdash; {membersWithoutRoles.length}</div>
                {membersWithoutRoles.map((member) => (
                  <MemberListItem
                    key={member.user.id}
                    member={member}
                    onMention={onMention}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Channel = ({ channel }) => {
  const { guildId } = useGuildContext();
  const [forceScrollDown, setForceScrollDown] = useState(false);
  const [highlightId, setHighlightId] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const messagesRef = useRef();
  const { channelMessages, channelPendingMessages } = useChannelsStore();

  const messages = channelMessages[channel?.channel_id] || [];

  useEffect(() => {
    // If the channel id exists and we don't have messages loaded yet, load them
    if (channel?.channel_id && channelMessages[channel?.channel_id] == null) {
      ChannelsService.loadChannelMessages(channel?.channel_id).then(() => {
        setHasMore(channelMessages[channel?.channel_id]?.length === 50);
        setTimeout(() => setForceScrollDown(true), 0);
      });
    }

    if (!messagesRef.current) return;

    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [channel?.channel_id]);

  // If scroll is near bottom send an ACK message
  useEffect(() => {
    if (!messages || !channel?.channel_id) return;

    const el = messagesRef.current;
    if (!el) return;

    let lastAckTime = 0;
    let lastAckedMessageId = null;

    function checkAndAckAtBottom() {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      const now = Date.now();
      if (nearBottom && messages.length > 0) {
        const lastMessageId = messages[messages.length - 1]?.id;

        if (now - lastAckTime > 10000 && lastAckedMessageId !== lastMessageId) {
          ChannelsService.acknowledgeChannelMessage(
            channel.channel_id,
            lastMessageId
          );

          lastAckTime = now;
          lastAckedMessageId = lastMessageId;
        }

        UnreadsService.setLastReadMessageId(channel.channel_id, lastMessageId);
      }
    }

    const interval = setInterval(checkAndAckAtBottom, 100);

    return () => {
      clearInterval(interval);
    };
  }, [channel?.channel_id, messages]);

  useEffect(() => {
    if (!messagesRef.current) return;
    const nearBottom = messagesRef.current.scrollHeight - messagesRef.current.scrollTop - messagesRef.current.clientHeight < 100;
    if (forceScrollDown || nearBottom) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      if (forceScrollDown) {
        setForceScrollDown(false);
      }
    }
  }, [channelPendingMessages, messages, forceScrollDown]);

  const { guildMembers } = useGuildsStore();

  const activeGuildMembers = guildMembers[guildId] || [];

  useEffect(() => {
    if (!guildId) return;

    GuildsService.loadGuildMembers(guildId);

    const interval = setInterval(() => {
      GuildsService.loadGuildMembers(guildId);
    }, 5000);

    return () => clearInterval(interval);
  }, [guildId]);

  const onLoadMore = useCallback(async () => {
    const oldestMessage = messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];

    console.log('Loading more messages before ID:', oldestMessage.id);

    //ChannelsService.loadChannelMessages(channel.channel_id, oldestMessage.id);
  }, [channel, messages]);

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col bg-gray-700">
      <ChannelBar channel={channel} onJumpToMessage={() => { }} />
      <hr className="m-0 w-full border border-gray-800 bg-gray-800 p-0" />
      <div className="flex min-h-0 flex-1">
        <div className="flex w-full flex-1 flex-col">
          <ChannelMessages
            channelId={channel?.channel_id}
            messagesRef={messagesRef}
            highlightId={highlightId}
            onLoadMore={onLoadMore}
            loadingMore={loadingMore}
            hasMore={hasMore}
          />
          <ChannelInput channel={channel} />
        </div>

        {channel?.type !== 1 && (
          <MemberList guildId={guildId} activeGuildMembers={activeGuildMembers} />
        )}
      </div>
    </div>
  );
};

export default Channel;
