import { Bell, Chats, Hash, MagnifyingGlass, PushPin, Question, Tray, Users } from '@phosphor-icons/react';

const Tooltip = ({ text = 'Hello' }) => {
  return (
    <div className="pointer-events-none absolute top-full mt-1 hidden flex-col items-center group-hover:flex">
      <div className="-mb-2 h-3 w-3 rotate-45 bg-black"></div>
      <div className="relative min-w-max rounded bg-black py-1.5 px-3 text-sm text-gray-100 shadow-lg">
        {text}
      </div>
    </div>
  );
};

const IconButton = ({ icon, tooltipText }) => {
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
    default:
      break;
  }

  return (
    <div className="group relative flex flex-col items-center">
      {iconEl}
      <Tooltip text={tooltipText} />
    </div>
  );
};

const SearchBar = () => {
  return (
    <div className="flex items-center justify-end">
      <input
        type="text"
        placeholder="Search"
        className="h-6 w-36 rounded p-2 text-sm outline-none transition-all duration-300 ease-in-out focus:w-60 bg-gray-900 text-gray-100 placeholder-gray-500"
      />
      <MagnifyingGlass className="absolute mr-2 text-gray-400" />
    </div>
  );
};

const ChannelBar = ({ channelName }) => {
  return (
    <div className="relative flex h-12 w-full items-center justify-between py-3 px-4">
      <div className="relative flex min-w-0 flex-auto items-center overflow-hidden">
        <Hash className="mr-2 overflow-hidden text-gray-500 size-6" />
        <h1 className="text-base font-semibold text-gray-100">
          {channelName}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <IconButton icon={"threads"} tooltipText={"Threads"} />
        <IconButton icon={"bell"} tooltipText={"Notification Settings"} />
        <IconButton icon={"pin"} tooltipText={"Pinned Messages"} />
        <IconButton icon={"users"} tooltipText={"Show Member List"} />
        <SearchBar />
        <IconButton icon={"inbox"} tooltipText={"Inbox"} />
        <IconButton icon={"question"} tooltipText={"Help"} />
      </div>
    </div>
  );
};

export default ChannelBar;
