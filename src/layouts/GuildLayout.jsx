// TODO: Move to GuildChannel.jsx, this isn't a layout.

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner'
import BaseAuthLayout from './BaseAuthLayout';
import ServerSettings from '../components/Settings/ServerSettings';
import useStore from '../hooks/useStore';
import EditGuildChannelModal from '../components/Modals/EditGuildChannelModal';
import { useChannelsStore } from '../stores/channels.store';
import GuildSidebar from '@/components/Guild/GuildSidebar';

const GuildLayout = ({ children, guild }) => {
  const store = useStore();
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);
  const [isEditChannelModalOpen, setIsEditChannelModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('info');
  const [editChannelId, setEditChannelId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isGuildOwner =
    guild?.owner_id != null &&
    store.user?.id != null &&
    String(guild.owner_id) === String(store.user.id);
  const { channels } = useChannelsStore();

  const openServerSettings = useCallback(
    ({ tab = 'info', channelId = null } = {}) => {
      if (!isGuildOwner) {
        toast.error('Only the server owner can open server settings.');
        return;
      }
      setSettingsTab(tab);
      setEditChannelId(channelId);
      setIsServerSettingsOpen(true);
    },
    [isGuildOwner]
  );

  const openEditChannelModal = useCallback(
    ({ channelId = null } = {}) => {
      if (!isGuildOwner) {
        toast.error('Only the server owner can edit channels.');
        return;
      }
      setEditChannelId(channelId);
      setIsEditChannelModalOpen(true);
    },
    [isGuildOwner]
  );

  // Open sidebar when a new guild is selected
  useEffect(() => {
    setIsSidebarOpen(true);
  }, [guild?.id]);

  return (
    <BaseAuthLayout>
      <div className="flex h-screen w-screen">
        {isSidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-transparent md:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
          />
        )}
        <div
          className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 transition-transform duration-300 ease-out md:static md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <GuildSidebar
            guild={guild}
            onOpenServerSettings={() => openServerSettings({ tab: 'info', channelId: null })}
            onEditChannel={(channel) => {
              openEditChannelModal({ channelId: channel.channel_id || channel.id });
            }}
            canOpenServerSettings={isGuildOwner}
            canManageChannels={isGuildOwner}
          />
        </div>
        {!isSidebarOpen && (
          <button
            type="button"
            className="fixed left-0 top-1/2 z-30 h-24 w-4 -translate-y-1/2 rounded-r border border-gray-600/60 bg-gray-800/70 shadow-sm transition-all duration-300 hover:w-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary animate-pulse md:hidden"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open sidebar"
          />
        )}
        <main className="relative flex min-w-0 flex-1 flex-col bg-gray-700">
          {children}
        </main>
      </div>
      <ServerSettings
        isOpen={isServerSettingsOpen}
        onClose={() => setIsServerSettingsOpen(false)}
        guild={guild}
        initialTab={settingsTab}
        editChannelId={editChannelId}
        onEditChannelChange={setEditChannelId}
      />
      <EditGuildChannelModal
        isOpen={isEditChannelModalOpen}
        setIsOpen={setIsEditChannelModalOpen}
        guild={guild}
        onClose={() => setIsEditChannelModalOpen(false)}
        channel={channels.find((c) => String(c.channel_id) === String(editChannelId))}
      />
    </BaseAuthLayout>
  );
};

export default GuildLayout;