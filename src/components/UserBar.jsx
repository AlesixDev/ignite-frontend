import { Microphone, Headphones, Gear } from '@phosphor-icons/react';
import useStore from '../hooks/useStore';

const UserIcon = () => {
  const store = useStore();

  return (
    <div className="relative -ml-1 flex h-8 w-8">
      {store.user.avatar ? (
        <img className="rounded-full bg-white" src={user.avatar} />
      ) : (
      <div className="rounded-full size-8 bg-gray-700 text-gray-300 flex items-center justify-center">
        {store.user.username[0].toUpperCase()}
      </div>
      )}
      <div className="absolute -bottom-1 -right-1  h-4 w-4 items-center justify-center rounded-full bg-gray-900 text-center">
        <div className="relative left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-600 text-center"></div>
      </div>
    </div>
  );
};

const UserName = () => {
  const store = useStore();

  return (
    <div className="flex flex-col">
      <div className="text-sm font-semibold text-gray-100">
        {store.user.username}
      </div>
      <div className="text-xs font-medium text-gray-500">{store.user.status || 'Online'}</div>
    </div>
  );
};

const ActionsIcons = () => {
  return (
    <div className="ml-auto flex">
      <div className="flex size-8 cursor-pointer items-center justify-center rounded text-center hover:bg-gray-700">
        <Microphone className="cursor-pointer text-gray-400 hover:text-gray-200 size-5" weight="fill" />
      </div>
      <div className="flex size-8 cursor-pointer items-center justify-center rounded text-center hover:bg-gray-700">
        <Headphones className="cursor-pointer text-gray-400 hover:text-gray-200 size-5" weight="fill" />
      </div>
      <div className="flex size-8 cursor-pointer items-center justify-center rounded text-center hover:bg-gray-700">
        <Gear className="cursor-pointer text-gray-400 hover:text-gray-200 size-5" weight="fill" />
      </div>
    </div>
  );
};

const UserBar = () => {  
  return (
    <div className="flex h-14 w-full items-center bg-gray-200 dark:bg-gray-900">
      <div className="flex flex-auto items-center p-2">
        <div className="flex w-full cursor-pointer gap-2 rounded p-1 dark:hover:bg-gray-700">
          <UserIcon />
          <UserName />
        </div>
        <ActionsIcons />
      </div>
    </div>
  );
};

export default UserBar;
