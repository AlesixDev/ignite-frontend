import { useEffect, useMemo, useState } from 'react';
import useStore from '../../hooks/useStore';
import UserInfo from './UserInfo';
import UserConnections from './UserConnections';

const UserSettings = ({ isOpen, onClose }) => {
  const store = useStore();
  const [activeTab, setActiveTab] = useState('info');

  const tabs = useMemo(
    () => [
      { id: 'info', label: 'User Info', component: <UserInfo user={store.user} /> },
      { id: 'connections', label: 'Connections', component: <UserConnections user={store.user} /> },
    ],
    [store.user]
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) setActiveTab('info');
  }, [isOpen]);

  if (!isOpen) return null;

  const activeContent = tabs.find((tab) => tab.id === activeTab)?.component;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-4xl overflow-hidden rounded-lg bg-gray-900 text-gray-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold">User Settings</h2>
            <p className="text-sm text-gray-400">{store.user?.username || 'Account'}</p>
          </div>
          <button
            type="button"
            className="rounded border border-gray-700 px-3 py-1 text-sm text-gray-200 hover:bg-gray-800"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="flex min-h-[460px]">
          <nav className="w-56 shrink-0 border-r border-gray-800 bg-gray-950/40 p-4">
            <div className="space-y-1 text-sm font-medium">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`w-full rounded px-3 py-2 text-left transition-colors ${
                    activeTab === tab.id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/60'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>
          <div className="flex-1 p-6">{activeContent}</div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
