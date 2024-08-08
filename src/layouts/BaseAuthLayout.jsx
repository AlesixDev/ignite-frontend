import { Compass, Envelope, Fire, Lightning, Plant, Plus } from '@phosphor-icons/react';

const SidebarIcon = ({ icon, isActive = false, isServerIcon = false, text = 'tooltip' }) => (
  <div className="group relative mb-2 min-w-min px-3">
    <div className={`absolute top-1 -left-1 h-10 w-2 scale-0 rounded-lg bg-gray-100 transition-all ${!isActive ? 'group-hover:scale-y-50 group-hover:scale-x-100' : 'scale-100'}`}></div>
    <div className={`relative flex items-center justify-center h-12 w-12 mx-auto  hover:bg-primary hover:text-white  hover:rounded-xl transition-all duration-300 ease-out cursor-pointer ${isActive ? 'bg-primary text-white rounded-xl' : 'bg-gray-700 rounded-3xl text-gray-100'} ${!isServerIcon ? "text-green-500 hover:bg-green-500 hover:text-white" : ''}`}>
      {icon}
      <span className="absolute w-auto p-2 m-2 min-w-max left-14 rounded-md shadow-lg text-white bg-gray-900 text-sm font-bold transition-all duration-100 scale-0 origin-left group-hover:scale-100">
        {text}
      </span>
    </div>
  </div>
);

const Sidebar = () => {
  return (
    <div className="relative top-0 left-0 m-0 flex h-screen min-w-min flex-col items-center bg-gray-900 pt-3 textwhite shadow">
      <SidebarIcon icon={<Envelope className="size-6" />} isServerIcon={true} text="Direct Messages" />
      <hr className="bg-gray-800 border border-gray-800 rounded-full mx-auto mb-2 w-8" />
      <SidebarIcon icon={<Fire className="size-6" />} isActive={true} isServerIcon={true} />
      <SidebarIcon icon={<Lightning className="size-6" />} isServerIcon={true} />
      <SidebarIcon icon={<Plant className="size-6" />} isServerIcon={true} />
      <SidebarIcon icon={<Plus className="size-6" />} text="Add a Server" />
      <SidebarIcon icon={<Compass className="size-6" />} text="Explore Public Servers" />
    </div>
  );
};

const DefaultLayout = ({ children }) => {
  return (
    <div className="flex">
      <Sidebar />
      {children}
    </div>
  );
};

export default DefaultLayout;
