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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6">
      <div className="w-full max-w-4xl overflow-y-auto rounded-lg bg-gray-900 text-gray-100 shadow-2xl max-h-[calc(100vh-1.5rem)]">
        <div className="flex flex-col gap-3 border-b border-gray-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-xl font-semibold">User Settings</h2>
            <p className="text-sm text-gray-400">{store.user?.username || 'Account'}</p>
          </div>
          <button
            type="button"
            className="self-start rounded border border-gray-700 px-3 py-1 text-sm text-gray-200 hover:bg-gray-800 sm:self-auto"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="flex min-h-[460px] flex-col md:flex-row">
          <nav className="w-full shrink-0 border-b border-gray-800 bg-gray-950/40 p-3 md:w-56 md:border-b-0 md:border-r md:p-4">
            <div className="flex gap-2 overflow-x-auto text-sm font-medium md:block md:space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`whitespace-nowrap rounded px-3 py-2 text-left transition-colors md:w-full ${
                    activeTab === tab.id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/60'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>
          <div className="flex-1 p-4 sm:p-6">{activeContent}</div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
