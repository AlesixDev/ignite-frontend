import { Bell, Chats, Hash, MagnifyingGlass, PushPin, Question, Tray, Users } from '@phosphor-icons/react';
import { useState } from 'react';
import GuildMembersModal from './Modals/GuildMembersModal.jsx';
import SearchModal from './Modals/SearchModal.jsx';

const Tooltip = ({ text = 'Hello' }) => {
  return (
    <div className="pointer-events-none absolute top-full z-50 mt-1 hidden flex-col items-center group-hover:flex">
      <div className="-mb-2 size-3 rotate-45 bg-black"></div>
      <div className="relative min-w-max rounded bg-black px-3 py-1.5 text-sm text-gray-100 shadow-lg">
        {text}
      </div>
    </div>
  );
};

const IconButton = ({ icon, tooltipText, onClick }) => {
  const iconClassName = 'size-6 cursor-pointer text-gray-400 hover:text-gray-200';

  let iconEl;

  switch (icon) {
    case 'bell':
      iconEl = <Bell className={iconClassName} />;
      break;
    case 'threads':
      iconEl = <Chats className={iconClassName} />;
      break;
    case 'hashtag':
      iconEl = <Hash className={iconClassName} />;
      break;
    case 'pin':
      iconEl = <PushPin className={iconClassName} />;
      break;
    case 'question':
      iconEl = <Question className={iconClassName} />;
      break;
    case 'inbox':
      iconEl = <Tray className={iconClassName} />;
      break;
    case 'users':
      iconEl = <Users className={iconClassName} />;
      break;
    case 'search':
      iconEl = <MagnifyingGlass className={iconClassName} />;
      break;
    default:
      break;
  }

  return (
    <button type="button" onClick={onClick} className="group relative flex h-6 items-center justify-center">
      {iconEl}
      <Tooltip text={tooltipText} />
    </button>
  );
};

const ChannelBar = ({ channel, onJumpToMessage }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  return (
    <>
      <div className="relative">
        <div className="relative flex h-12 w-full items-center justify-between px-4 py-3">
          <div className="relative flex min-w-0 flex-auto items-center overflow-hidden">
            <Hash className="mr-2 size-6 text-gray-500" />
            <h1 className="text-base font-semibold text-gray-100">
              {channel?.name}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <IconButton icon="threads" tooltipText="Threads" />
            <IconButton icon="bell" tooltipText="Notification Settings" />
            <IconButton icon="pin" tooltipText="Pinned Messages" />
            <IconButton icon="users" tooltipText="Show Member List" onClick={() => setMembersOpen(true)} />
            <IconButton icon="search" tooltipText="Search" onClick={() => setSearchOpen(true)} />
            <IconButton icon="inbox" tooltipText="Inbox" />
            <IconButton icon="question" tooltipText="Help" />
          </div>
        </div>
        <GuildMembersModal
          open={membersOpen}
          onClose={() => setMembersOpen(false)}
          guildId={channel?.guild_id}
        />
      </div>

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        channel={channel}
        onPick={onJumpToMessage}
      />
    </>
  );
};

export default ChannelBar;
