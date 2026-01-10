import { Microphone, Headphones, Gear } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import useStore from '../hooks/useStore';
import UserSettings from './Settings/UserSettings';

const UserIcon = () => {
  const store = useStore();

  return (
    <div className="relative -ml-1 flex h-8 w-8">
      {store.user?.avatar ? (
        <img className="rounded-full bg-white" src={store.user.avatar} />
      ) : (
        <div className="flex size-8 items-center justify-center rounded-full bg-gray-700 text-gray-300">
          {store.user?.username?.[0]?.toUpperCase()}
        </div>
      )}
      <div className="absolute -bottom-1 -right-1 h-4 w-4 items-center justify-center rounded-full bg-gray-900 text-center">
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
        {store.user?.username}
      </div>
      <div className="text-xs font-medium text-gray-500">{store.user?.status || 'Online'}</div>
    </div>
  );
};

const ActionsIcons = ({ onOpenSettings }) => {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="ml-auto flex">
      <div className="flex size-8 cursor-pointer items-center justify-center rounded text-center hover:bg-gray-700">
        <Microphone className="size-5 cursor-pointer text-gray-400 hover:text-gray-200" weight="fill" />
      </div>
      <div className="flex size-8 cursor-pointer items-center justify-center rounded text-center hover:bg-gray-700">
        <Headphones className="size-5 cursor-pointer text-gray-400 hover:text-gray-200" weight="fill" />
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex size-8 items-center justify-center rounded text-center hover:bg-gray-700"
        >
          <Gear className="size-5 cursor-pointer text-gray-400 hover:text-gray-200" weight="fill" />
        </button>

        {open && (
          <div className="absolute bottom-10 right-0 z-50 w-40 overflow-hidden rounded-md border border-gray-800 bg-gray-900 shadow-xl">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenSettings?.();
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-800"
            >
              User Settings
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                store.logout();
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-800"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const UserBar = () => {
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);

  return (
    <div className="flex h-14 w-full items-center bg-gray-200 dark:bg-gray-900">
      <div className="flex flex-auto items-center p-2">
        <div className="flex w-full cursor-pointer gap-2 rounded p-1 dark:hover:bg-gray-700">
          <UserIcon />
          <UserName />
        </div>
        <ActionsIcons onOpenSettings={() => setIsUserSettingsOpen(true)} />
      </div>
      <UserSettings isOpen={isUserSettingsOpen} onClose={() => setIsUserSettingsOpen(false)} />
    </div>
  );
};

export default UserBar;
