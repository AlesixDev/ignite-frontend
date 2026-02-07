import * as Popover from '@radix-ui/react-popover';
import { InputGroup } from '../ui/input-group';
import { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from '../ui/emoji-picker';
import { useChannelContext } from '../../contexts/ChannelContext.jsx';
import { useGuildsStore } from '../../store/guilds.store';
import { useGuildContext } from '../../contexts/GuildContext';
import { useState, useCallback, useMemo, useRef } from 'react';
import { Button } from '../ui/button';
import { Smile } from 'lucide-react';
import { ChannelsService } from '../../services/channels.service';

const MAX_MESSAGE_LENGTH = 2000;
const SUGGESTIONS_LIMIT = 10;

/* -------------------------------- utils -------------------------------- */

const serializeFromDom = (root) => {
  let out = '';

  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.nodeValue ?? '';
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    if (node.dataset?.mention === 'user') {
      out += `<@${node.dataset.id}>`;
      return;
    }

    if (node.tagName === 'BR') {
      out += '\n';
      return;
    }

    for (const c of node.childNodes) walk(c);
  };

  for (const c of root.childNodes) walk(c);
  return out;
};

const insertTextAtCaret = (text) => {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;

  const range = sel.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
};

const getMentionQuery = (root) => {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;

  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;

  const pre = range.cloneRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);

  const text = pre.toString();
  const idx = text.lastIndexOf('@');

  if (idx === -1) return null;
  if (idx > 0 && ![' ', '\n'].includes(text[idx - 1])) return null;

  const query = text.slice(idx + 1);
  if (query.includes(' ') || query.includes('\n')) return null;

  return query;
};

const replaceAtQueryWithMention = (query, user, resolveUser) => {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;

  const range = sel.getRangeAt(0);

  // delete "@query"
  const del = range.cloneRange();
  del.setStart(range.startContainer, Math.max(0, range.startOffset - (query.length + 1)));
  del.deleteContents();

  const mention = document.createElement('span');
  mention.contentEditable = 'false';
  mention.dataset.mention = 'user';
  mention.dataset.id = user.user_id;

  const resolved = resolveUser(user.user_id);
  mention.textContent = resolved.label;
  mention.className = 'inline-flex rounded px-1.5 py-0.5 mx-[1px] select-none';
  mention.style.background =
    resolved.color !== 'inherit'
      ? `${resolved.color}33`
      : 'rgba(88,101,242,0.18)';
  mention.style.color =
    resolved.color !== 'inherit'
      ? resolved.color
      : 'rgb(88,101,242)';

  range.insertNode(mention);
  mention.after(document.createTextNode(' '));

  range.setStartAfter(mention.nextSibling);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
};

const convertSerializedMentions = (root, members, resolveUser) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;

  while ((node = walker.nextNode())) {
    const match = node.nodeValue.match(/<@(\d+)>/);
    if (!match) continue;

    const userId = match[1];
    const user = members.find((m) => m.user_id === userId) ?? { user_id: userId };

    const range = document.createRange();
    range.setStart(node, match.index);
    range.setEnd(node, match.index + match[0].length);
    range.deleteContents();

    replaceAtQueryWithMention('', user, resolveUser);
  }
};

/* ------------------------------- component ------------------------------- */

const ChannelInput = ({ channel }) => {
  const { inputMessage, setInputMessage } = useChannelContext();
  const editorRef = useRef(null);

  const { guildId } = useGuildContext();
  const guildsStore = useGuildsStore();
  const members = guildsStore.guildMembers[guildId] || [];

  const resolveUser = useCallback(
    (id) => {
      const m = members.find((x) => x.user_id === id);
      if (!m) return { label: '@unknown-user', color: 'inherit' };

      const role = [...(m.roles || [])]
        .sort((a, b) => b.position - a.position)
        .find((r) => r.color && r.color !== 0);

      return {
        label: `@${m.user.username}`,
        color: role ? `#${role.color.toString(16).padStart(6, '0')}` : 'inherit'
      };
    },
    [members]
  );

  /* ---------------- mentions ---------------- */

  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const filteredMembers = useMemo(() => {
    if (!mentionQuery) return [];
    return members
      .filter((m) =>
        m.user.username.toLowerCase().includes(mentionQuery.toLowerCase())
      )
      .slice(0, SUGGESTIONS_LIMIT);
  }, [members, mentionQuery]);

  /* ---------------- handlers ---------------- */

  const syncValue = useCallback(() => {
    if (!editorRef.current) return;
    setInputMessage(serializeFromDom(editorRef.current));
  }, [setInputMessage]);

  const handleInput = () => {
    syncValue();
    setMentionQuery(getMentionQuery(editorRef.current));
    setMentionIndex(0);
  };

  const handleKeyDown = (e) => {
    if (mentionQuery && filteredMembers.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => Math.min(i + 1, filteredMembers.length - 1));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => Math.max(i - 1, 0));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        replaceAtQueryWithMention(
          mentionQuery,
          filteredMembers[mentionIndex],
          resolveUser
        );
        setMentionQuery(null);
        syncValue();
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    insertTextAtCaret(e.clipboardData.getData('text/plain'));
    convertSerializedMentions(editorRef.current, members, resolveUser);
    syncValue();
  };

  const sendMessage = () => {
    if (!channel?.channel_id || !inputMessage.trim()) return;
    if (inputMessage.length > MAX_MESSAGE_LENGTH) return;

    ChannelsService.sendChannelMessage(channel.channel_id, inputMessage);
    setInputMessage('');
    editorRef.current.innerHTML = '';
  };

  /* ---------------- render ---------------- */

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gray-700/95 px-4 pt-2 pb-4">
      <InputGroup className="relative flex items-end bg-gray-800">
        <Popover.Root
          open={!!mentionQuery && filteredMembers.length > 0}
          modal={false}
        >
          <Popover.Anchor asChild>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              className="min-h-[44px] w-full px-3 py-3 text-sm outline-none"
              data-placeholder="Message"
            />
          </Popover.Anchor>

          <Popover.Portal>
            <Popover.Content
              side="top"
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
              className="z-50 w-full rounded bg-gray-800 p-2 shadow"
            >
              {filteredMembers.map((m, i) => (
                <button
                  key={m.user_id}
                  className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left ${
                    i === mentionIndex ? 'bg-gray-700' : 'hover:bg-gray-700/60'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    replaceAtQueryWithMention(mentionQuery, m, resolveUser);
                    setMentionQuery(null);
                    syncValue();
                  }}
                >
                  <div className="flex-1 truncate">{m.user.name}</div>
                  <div className="text-xs text-gray-400">@{m.user.username}</div>
                </button>
              ))}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <Popover.Root modal={false}>
          <Popover.Trigger asChild>
            <Button variant="ghost" className="h-8 w-8 text-gray-400">
              <Smile className="size-5" />
            </Button>
          </Popover.Trigger>
          <Popover.Content side="top" align="end" className="p-0">
            <EmojiPicker
              onEmojiSelect={({ emoji }) => {
                insertTextAtCaret(emoji);
                syncValue();
              }}
            >
              <EmojiPickerSearch />
              <EmojiPickerContent />
              <EmojiPickerFooter />
            </EmojiPicker>
          </Popover.Content>
        </Popover.Root>
      </InputGroup>
    </div>
  );
};

export default ChannelInput;
