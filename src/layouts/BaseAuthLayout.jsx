import { useState } from 'react';
import { Compass, Fire, Plus } from '@phosphor-icons/react';
import { useGuildsStore } from '../stores/guilds.store';
import GuildDialog from '../components/GuildDialog';
import { useNavigate } from 'react-router-dom';
import UserBar from '../components/UserBar';

const SidebarIcon = ({ icon = '', iconUrl = '', onClick, isActive = false, isServerIcon = false, text = 'tooltip' }) => (
  <button className="group relative mb-2 min-w-min px-3" type="button" onClick={onClick}>
    <div className={`absolute -left-1 top-1 h-10 w-2 scale-0 rounded-lg bg-gray-100 transition-all ${!isActive ? 'group-hover:scale-x-100 group-hover:scale-y-50' : 'scale-100'}`}></div>
    <div className={`relative mx-auto flex size-12 cursor-pointer items-center justify-center transition-all duration-300 ease-out hover:rounded-xl hover:bg-gray-600/60 hover:text-white ${isActive ? 'rounded-xl bg-gray-600/60 text-white' : 'rounded-3xl bg-gray-700 text-gray-100'} ${!isServerIcon ? 'text-green-500 hover:bg-green-500 hover:text-white' : ''}`}>
      {icon ? (
        icon
      ) : iconUrl ? (
        <img src={iconUrl} alt={text} className="size-12 rounded-3xl object-cover" />
      ) : (
        <span className="text-xl leading-none text-gray-400">{text.slice(0, 2)}</span>
      )}
      <span className="absolute left-14 m-2 w-auto min-w-max origin-left scale-0 rounded-md bg-gray-900 p-2 text-sm font-bold text-white shadow-lg transition-all duration-100 group-hover:scale-100">
        {text}
      </span>
    </div>
  </button>
);

const Sidebar = () => {
  const navigate = useNavigate();
  const { guilds, activeGuildId, setActiveGuildId } = useGuildsStore();

  const [isGuildDialogOpen, setIsGuildDialogOpen] = useState(false);

  const handleGuildClick = (guildId) => {
    setActiveGuildId(guildId);
    navigate(`/channels/${guildId}`);
  }

  return (
    <>
      <div className="relative left-0 top-0 m-0 flex h-screen min-w-min flex-col items-center bg-gray-900 pt-3 text-white shadow">
        <SidebarIcon
          icon={<Fire className="size-6" />}
          isServerIcon={true}
          text="Direct Messages"
          isActive={activeGuildId === '@me'}
          onClick={() => {
            setActiveGuildId('@me');
            navigate('/channels/@me');
          }}
        />
        <hr className="mx-auto mb-2 w-8 rounded-full border border-gray-800 bg-gray-800" />
        {guilds.map((guild) => (
          <SidebarIcon
            key={guild.id}
            text={guild.name}
            iconUrl={guild.icon || ''}
            onClick={() => handleGuildClick(guild.id)}
            isActive={activeGuildId == guild.id}
            isServerIcon={true}
          />
        ))}
        <SidebarIcon icon={<Plus className="size-6" />} text="Add a Server" onClick={() => setIsGuildDialogOpen(true)} />
        <SidebarIcon icon={<Compass className="size-6" />} text="Explore Public Servers" />
      </div>
      <GuildDialog isOpen={isGuildDialogOpen} setIsOpen={setIsGuildDialogOpen} />
    </>
  );
};

const DefaultLayout = ({ children }) => {
  return (
    <div className="flex">
      <Sidebar />
      {children}
      <UserBar />
    </div>
  );
};

export default DefaultLayout;
