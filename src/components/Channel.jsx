import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner'
import { NotePencil, Trash, ArrowBendUpLeft, XCircle, PushPin } from '@phosphor-icons/react';
import api from '../api';
import useStore from '../hooks/useStore';
import { GuildsService } from '../services/guilds.service';
import { useGuildsStore } from '../stores/guilds.store';
import { useGuildContext } from '../contexts/GuildContext';
import { useChannelContext } from '../contexts/ChannelContext.jsx';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from './ui/context-menu';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { InputGroup, InputGroupInput } from './ui/input-group';
import { Badge } from './ui/badge';
import ChannelBar from './ChannelBar.jsx';
import GuildMemberContextMenu from './GuildMemberContextMenu';
import GuildMemberPopoverContent from './GuildMemberPopoverContent';

const ChannelMessage = ({ message, prevMessage, pending }) => {
  const { guildId } = useGuildContext();
  const store = useStore();
  const guildsStore = useGuildsStore();
  const authorMenuRef = useRef(null);
  const [authorMenuOpen, setAuthorMenuOpen] = useState(false);

  const { messages, setMessages, editingId, setEditingId, setReplyingId, setPinId, inputRef, setInputMessage } = useChannelContext();

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

    const member = activeGuild?.members?.find((m) => m.user_id === store.user.id);
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
          <div className="flex items-start px-4">
            {shouldStack ? (
              <div className="w-14" />
            ) : (
              <ContextMenu>
                <PopoverTrigger>
                  <ContextMenuTrigger>
                    {message?.author.avatar ? (
                      <img className="h-10 cursor-pointer rounded-full bg-transparent" src={message?.author.avatar} alt="User avatar" />
                    ) : (
                      <div className="mr-4 flex size-10 cursor-pointer items-center justify-center rounded-full bg-gray-800 text-gray-300">
                        {message?.author?.name?.slice(0, 1).toUpperCase()}
                      </div>
                    )}
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
                    <span className="font-semibold leading-none text-gray-100">
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
            const link = `${window.location.origin}/channels/${message.channel_id}/${message.id}`;
            navigator.clipboard.writeText(link);
            toast.success('Message link copied to clipboard.');
          }}>
            Copy Message Link
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

const ChannelMessages = ({ messagesRef, highlightId, onLoadMore, loadingMore, hasMore }) => {
  const { messages, pendingMessages, setEditingId, replyingId, setReplyingId } = useChannelContext();
  const [atTop, setAtTop] = useState(false);

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
  }, [messagesRef, messages?.length]);

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
  const { messages, setMessages, pendingMessages, setPendingMessages, replyingId, setReplyingId, inputMessage, setInputMessage, inputRef } = useChannelContext();

  const replyMessage = useMemo(() => replyingId ? messages.find((m) => m.id == replyingId) : null, [messages, replyingId]);

  const sendMessage = useCallback(async (event) => {
    event.preventDefault();

    if (!channel?.channel_id || !inputMessage) {
      return;
    }

    try {
      const generatedNonce = Date.now().toString() + Math.floor(Math.random() * 1000).toString();

      setPendingMessages([...pendingMessages, {
        nonce: generatedNonce,
        content: inputMessage,
        author: {
          id: useStore.getState().user.id,
          name: useStore.getState().user.name ?? useStore.getState().user.username,
          username: useStore.getState().user.username,
        },
        created_at: new Date().toISOString(),
      }]);

      api.post(`/channels/${channel.channel_id}/messages`, {
        content: inputMessage,
        nonce: generatedNonce,
        reply_to: replyingId
      }).then((response) => {
        setPendingMessages((pendingMessages) => pendingMessages.filter((m) => m.nonce !== generatedNonce));
        setMessages((messages) => {
          if (messages.some((m) => m.nonce === generatedNonce)) {
            return messages;
          }
          return [...messages, response.data];
        });
      });

      setInputMessage('');
      setReplyingId(null);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Could not send message.');
    }
  }, [channel?.channel_id, inputMessage, pendingMessages, replyingId, setInputMessage, setMessages, setPendingMessages, setReplyingId]);

  useEffect(() => {
    if (replyingId) {
      inputRef.current.focus();
    }
  }, [inputRef, replyingId]);

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
        </InputGroup>
      </form>
    </div>
  );
};

const Channel = ({ channel }) => {
  const { guildId } = useGuildContext();
  const { messages, setMessages, pendingMessages, setPendingMessages, memberListOpen, setInputMessage, inputRef } = useChannelContext();
  const [forceScrollDown, setForceScrollDown] = useState(false);
  const [highlightId, setHighlightId] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const messagesRef = useRef();

  const fetchMessages = useCallback(async (opts = {}) => {
    if (!channel?.channel_id) return;

    const limit = opts.limit ?? 50;
    const before = opts.before;

    const params = { limit };
    if (before) params.before = before;

    return api.get(`/channels/${channel.channel_id}/messages`, { params }).then((response) => {
      const data = Array.isArray(response.data) ? response.data : [];
      return data;
    }).catch((error) => {
      console.error(error);
      toast.error(error.response?.data?.message || 'Could not fetch messages.');
      return [];
    });
  }, [channel?.channel_id]);

  useEffect(() => {
    setMessages([]);
    setPendingMessages([]);
    setHasMore(true);

    fetchMessages({ limit: 50 }).then((data) => {
      setMessages(data);
      setHasMore(data?.length === 50);
      setTimeout(() => setForceScrollDown(true), 0);
    });
  }, [fetchMessages, setMessages, setPendingMessages]);

  useEffect(() => {
    if (!messagesRef.current) return;
    const nearBottom = messagesRef.current.scrollHeight - messagesRef.current.scrollTop - messagesRef.current.clientHeight < 100;
    if (forceScrollDown || nearBottom) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      if (forceScrollDown) {
        setForceScrollDown(false);
      }
    }
  }, [pendingMessages, messages, forceScrollDown]);

  useEffect(() => {
    if (!channel) {
      return;
    }

    window.Echo.private(`channel.${channel.channel_id}`)
      .listen('.message.created', (event) => {
        if (event.channel.id == channel.channel_id) {
          setMessages((prev) => {
            if (
              event.message.nonce
                ? prev.some((m) => m.nonce === event.message.nonce)
                : prev.some((m) => m.id === event.message.id)
            ) {
              return prev;
            }
            return [...prev, event.message];
          });
          setPendingMessages((prev) =>
            event.message.nonce
              ? prev.filter((m) => m.nonce !== event.message.nonce)
              : prev.filter((m) => m.id !== event.message.id)
          );
        }
      })
      .listen('.message.updated', (event) => {
        console.log('message updated');
        if (event.channel.id == channel.channel_id) {
          setMessages((prev) => prev.map((m) => m.id === event.message.id ? { ...m, content: event.message.content, updated_at: event.message.updated_at } : m));
        }
      })
      .listen('.message.deleted', (event) => {
        console.log('message deleted');
        if (event.channel.id == channel.channel_id) {
          setMessages((prev) => prev.filter((m) => m.id !== event.message.id));
        }
      });

    return () => {
      window.Echo.leave(`channel.${channel.channel_id}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel?.channel_id]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    if (!messagesRef.current) return;
    if (!messages || messages.length === 0) return;

    const oldestId = messages[0]?.id;
    if (!oldestId) return;

    setLoadingMore(true);

    const container = messagesRef.current;
    const prevScrollHeight = container.scrollHeight;

    const older = await fetchMessages({ limit: 50, before: oldestId });

    if (!older || older.length === 0) {
      setHasMore(false);
      setLoadingMore(false);
      return;
    }

    setHasMore(older.length === 50);

    const existing = new Set(messages.map((m) => String(m.id)));
    const dedupedOlder = older.filter((m) => !existing.has(String(m.id)));

    setMessages((prev) => [...dedupedOlder, ...prev]);

    requestAnimationFrame(() => {
      const newScrollHeight = container.scrollHeight;
      container.scrollTop = newScrollHeight - prevScrollHeight + container.scrollTop;
      setLoadingMore(false);
    });
  }, [fetchMessages, hasMore, loadingMore, messages, setMessages]);

  const scrollToMessage = useCallback((msgId) => {
    setHighlightId(msgId);
    setTimeout(() => setHighlightId(null), 2000);
    setTimeout(() => {
      const el = document.getElementById(`msg-${msgId}`);
      if (el && messagesRef.current) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }, []);

  const handleJumpToMessage = useCallback(async (msgId) => {
    if (!msgId) return;
    setForceScrollDown(false);

    const existingEl = document.getElementById(`msg-${msgId}`);
    if (existingEl) {
      scrollToMessage(msgId);
      return;
    }

    setLoadingMore(true);
    let workingMessages = Array.isArray(messages) ? [...messages] : [];
    let found = false;
    let pages = 0;
    const maxPages = 20;

    while (!found && pages < maxPages) {
      if (workingMessages.length === 0) {
        const initial = await fetchMessages({ limit: 50 });
        if (!initial || initial.length === 0) {
          setHasMore(false);
          break;
        }
        workingMessages = [...initial];
        setMessages(workingMessages);
      } else {
        const oldestId = workingMessages[0]?.id;
        if (!oldestId) break;

        const older = await fetchMessages({ limit: 50, before: oldestId });
        if (!older || older.length === 0) {
          setHasMore(false);
          break;
        }

        const existing = new Set(workingMessages.map((m) => String(m.id)));
        const dedupedOlder = older.filter((m) => !existing.has(String(m.id)));
        if (dedupedOlder.length > 0) {
          workingMessages = [...dedupedOlder, ...workingMessages];
          setMessages(workingMessages);
        }
      }

      await new Promise((resolve) => requestAnimationFrame(resolve));
      found = workingMessages.some((m) => String(m.id) === String(msgId));
      pages += 1;
    }

    setLoadingMore(false);

    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      scrollToMessage(msgId);
    } else {
      toast.error('Message not found in history.');
    }
  }, [fetchMessages, messages, scrollToMessage, setMessages]);

  // TODO: This is duplicated
  const onMention = useCallback((user) => {
    setInputMessage((prev) => `${prev} @${user.username} `);
    inputRef.current.focus();
  }, [inputRef, setInputMessage]);

  const { guilds } = useGuildsStore();

  const activeGuild = guilds.find((g) => g.id === guildId);

  useEffect(() => {
    if (!guildId) return;

    GuildsService.loadGuildMembers(guildId);

    const interval = setInterval(() => {
      GuildsService.loadGuildMembers(guildId);
    }, 5000);

    return () => clearInterval(interval);
  }, [guildId]);

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col bg-gray-700">
      <ChannelBar channel={channel} onJumpToMessage={handleJumpToMessage} />
      <hr className="m-0 w-full border border-gray-800 bg-gray-800 p-0" />
      <div className="flex min-h-0 flex-1">
        <div className="flex w-full flex-1 flex-col">
          <ChannelMessages
            messagesRef={messagesRef}
            highlightId={highlightId}
            onLoadMore={loadMore}
            loadingMore={loadingMore}
            hasMore={hasMore}
          />
          <ChannelInput channel={channel} fetchMessages={fetchMessages} />
        </div>
        <div className={`relative z-0 transition-all duration-300 ${memberListOpen ? 'w-60 md:w-72' : 'w-0'}`}>
          {memberListOpen && (
            <div className="flex h-full flex-col border-l border-gray-800 bg-gray-800">
              <div className="flex h-12 items-center border-b border-gray-700 px-4 text-sm font-semibold text-gray-300">
                Members
              </div>
              <div className="flex flex-1 flex-col gap-1 p-2 text-gray-400">
                {activeGuild?.members?.map((member) => (
                  <div key={member.user.id}>
                    <Popover>
                      <ContextMenu>
                        <PopoverTrigger className="w-full">
                          <ContextMenuTrigger>
                            <div key={member.user.id} className="flex items-center gap-3 rounded-md p-2 transition hover:bg-gray-700/50">
                              {member.user.avatar_url ? (
                                <img className="size-8 rounded-full bg-transparent" src={member.user.avatar_url} alt="User avatar" />
                              ) : (
                                <div className="flex size-8 items-center justify-center rounded-full bg-gray-700 text-gray-300">
                                  {member.user.username?.slice(0, 1).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-gray-100">{member.user.name ?? member.user.username}</p>
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
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Channel;
