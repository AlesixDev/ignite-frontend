import { Microphone, Headphones, Gear } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import useStore from '../hooks/useStore';
import { Dialog, DialogTrigger } from './ui/dialog';
import UserSettingsDialogContent from './UserSettingsDialogContent';
import { LogOut } from 'lucide-react';
import Avatar from './Avatar';
import { useLocation } from 'react-router-dom';

const UserIcon = () => {
  const store = useStore();

  return (
    <div className="relative -ml-1 flex h-8 w-8">
      <Avatar user={store.user} className="size-8" />
      {store.user.status !== 'offline' && (
        <div className="absolute -bottom-1 -right-1 h-4 w-4 items-center justify-center rounded-full bg-gray-900 text-center">
          <div className="relative left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-600 text-center"></div>
        </div>
      )}
    </div>
  );
};

const UserName = () => {
  const store = useStore();

  return (
    <div className="flex flex-col">
      <div className="text-sm font-semibold text-gray-100">
        {store.user?.name}
      </div>
      <div className="text-xs font-medium text-gray-500">{store.user?.status || 'Online'}</div>
    </div>
  );
};

const ActionsIcons = () => {
  const store = useStore();

  return (
    <div className="ml-auto flex">
      <button
        type="button"
        onClick={() => store.logout()}
        className="flex size-8 items-center justify-center rounded text-center hover:bg-gray-700"
      >
        <LogOut className="size-5 cursor-pointer text-gray-400 hover:text-gray-200" weight="fill" />
      </button>

      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded text-center hover:bg-gray-700"
          >
            <Gear className="size-5 cursor-pointer text-gray-400 hover:text-gray-200" weight="fill" />
          </button>
        </DialogTrigger>
        <UserSettingsDialogContent />
      </Dialog>
    </div>
  );
};

const UserBar = () => {
  const location = useLocation();

  // HACK: Only show UserBar in DMs (/channels/@me)
  const isDMRoute = location.pathname.startsWith('/channels/@me');

  return (
    <div className={`absolute left-0 bottom-0 mb-4 ml-4 flex h-14 items-center bg-gray-900 border border-gray-700 rounded-lg z-50${!isDMRoute ? ' hidden md:flex' : ''}`}>
      <div className="flex flex-auto items-center p-2">
        <div className="flex cursor-pointer gap-2 rounded p-1 hover:bg-gray-700 min-w-[210px]">
          <UserIcon />
          <UserName />
        </div>
        <ActionsIcons />
      </div>
    </div>
  );
};

export default UserBar;
