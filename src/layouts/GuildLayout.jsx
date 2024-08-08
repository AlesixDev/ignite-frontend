import { useState } from 'react';
import { Hash, Plus, CaretDown, CaretRight } from '@phosphor-icons/react';
import BaseAuthLayout from './BaseAuthLayout';
import UserBar from '../components/UserBar';

const textChannels = [
  { id: 1, name: 'general', active: true },
  { id: 2, name: 'memes', active: false },
  { id: 3, name: 'tech', active: false },
  { id: 4, name: 'food', active: false },
];
const voiceChannels = [
  { id: 1, name: 'Lounge', active: false },
  { id: 2, name: 'Games', active: false },
];

const GuildSidebarHeader = ({ guildName = '' }) => {
  return (
    <div className="w-full cursor-pointer py-3 px-4 transition-colors duration-100 hover:bg-gray-700">
      <div className="flex h-6 items-center">
        <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold">
          {guildName}
        </div>
        <CaretDown className="size-5" />
      </div>
    </div>
  );
};
  
const GuildSidebarSection = ({ sectionName = 'Text Channels', channels }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="flex w-full flex-col">
      <div className="mb-1 flex cursor-pointer items-center pt-4 text-gray-400 hover:text-gray-100">
        <div className="flex flex-auto items-center" onClick={() => setExpanded(!expanded)}>
          <div className="flex w-6 items-center justify-center">
            {expanded ? <CaretDown className="size-2" /> : <CaretRight className="size-2" />}
          </div>
          <span className="text-xs font-bold uppercase">{sectionName}</span>
        </div>
        <Plus className="mr-2 text-gray-400 size-3" />
      </div>
      {channels &&
        channels.map((channel) => (
          <div key={channel.id} className={`${!expanded && !channel.active ? 'hidden' : ''}`}>
            <div className={`mx-2 my-0.5 flex cursor-pointer items-center rounded px-2 py-1 hover:bg-gray-700 hover:text-gray-400 ${channel.active ? 'bg-gray-600 text-gray-100' : 'text-gray-500'}`}>
              <Hash className="text-gray-500 size-6" />
              <p className="ml-1 overflow-hidden text-ellipsis whitespace-nowrap text-base font-medium">
                {channel.name}
              </p>
            </div>
          </div>
        ))
      }
    </div>
  );
};

const GuildSidebar = ({ guild }) => {
  return (
    <div className="relative top-0 flex h-full min-w-[240px] flex-col items-center bg-gray-800 text-gray-100">
      <GuildSidebarHeader guildName={guild.name} />
      <hr className="m-0 w-full border border-gray-900 bg-gray-900 p-0" />
      <GuildSidebarSection sectionName="Text Channels" channels={textChannels} />
      <GuildSidebarSection sectionName="Voice Channels" channels={voiceChannels} />
    </div>
  );
};

const GuildLayout = ({ children, guild }) => {
  return (
    <BaseAuthLayout>
      <div className="flex flex-col">
        <GuildSidebar guild={guild} />
        <UserBar />
      </div>
      {children}
    </BaseAuthLayout>
  );
};

export default GuildLayout;
