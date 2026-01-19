import { useEffect, useMemo, useState } from 'react';
import ServerInfo from './ServerInfo';
import ServerRoleManager from './ServerRoleManager';
import ServerMemberManager from './ServerMemberManager';
import ServerInviteManager from './ServerInviteManager';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const ServerSettings = ({ isOpen, onClose, guild, initialTab = 'info' }) => {
  const [activeTab, setActiveTab] = useState('info');

  const tabs = useMemo(
    () => [
      { id: 'info', label: 'Server Info', component: <ServerInfo guild={guild} /> },
      { id: 'roles', label: 'Role Manager', component: <ServerRoleManager guild={guild} /> },
      { id: 'members', label: 'Member Management', component: <ServerMemberManager guild={guild} /> },
      { id: 'invites', label: 'Invites', component: <ServerInviteManager guild={guild} /> },
    ],
    [guild]
  );

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab || 'info');
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose?.() : null)}>
      <DialogContent
        showCloseButton={false}
        className="h-[100dvh] w-[100dvw] max-w-none overflow-hidden rounded-none p-0 sm:max-w-none"
      >
        <div className="flex h-full flex-col">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <DialogTitle className="text-xl">Server Settings</DialogTitle>
              <DialogDescription>{guild?.name || 'Server'}</DialogDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex min-h-0 flex-1 flex-col md:flex-row"
          >
            <ScrollArea className="h-16 w-full border-b border-border bg-muted/20 md:h-auto md:w-60 md:border-b-0 md:border-r">
              <TabsList className="h-full w-full flex-row items-stretch justify-start gap-1 rounded-none bg-transparent p-2 text-sm font-medium md:flex-col">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="w-full justify-start rounded-none px-3 py-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>

            <ScrollArea className="min-h-0 flex-1 p-4 sm:p-6">
              {tabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="mt-0 w-full min-w-0">
                  {tab.component}
                </TabsContent>
              ))}
            </ScrollArea>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServerSettings;
