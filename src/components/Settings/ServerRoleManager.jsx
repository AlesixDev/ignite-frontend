import { useEffect, useMemo, useState } from 'react';
import { CircleNotch, FloppyDisk } from '@phosphor-icons/react';
import { Plus } from 'lucide-react';
import api from '../../api';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';

const PERMISSIONS_LIST = {
  2: "Manage Guild",     // 2
  4: "Manage Channels",  // 4
  8: "Manage Messages",  // 8
  16: "Kick Members",     // 16
  32: "Ban Members"       // 32
};

const ServerRoleManager = ({ guild }) => {
  const [localRoles, setLocalRoles] = useState(guild?.roles ?? []);
  const [activePermissions, setActivePermissions] = useState(0);
  const [originalPermissions, setOriginalPermissions] = useState(0);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (guild?.roles) setLocalRoles(guild.roles);
  }, [guild?.roles]);

  useEffect(() => {
    if (localRoles.length > 0 && !selectedRoleId) {
      const firstRole = localRoles[0];
      setSelectedRoleId(firstRole.id);
      setActivePermissions(Number(firstRole.permissions || 0));
      setOriginalPermissions(Number(firstRole.permissions || 0));
    }
  }, [localRoles, selectedRoleId]);

  const handleCreateRole = async () => {
    if (isCreating) return;

    setIsCreating(true);
    try {
      const response = await api.post(`/guilds/${guild.id}/roles`, {
        name: 'new role',
        permissions: 0,
      });

      const newRole = response.data;
      setLocalRoles((prev) => [...prev, newRole]);
      setSelectedRoleId(newRole.id);
      setActivePermissions(0);
      setOriginalPermissions(0);
    } catch (error) {
      console.error('Failed to create role:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggle = (bit) => {
    const bitNum = Number(bit);
    setActivePermissions((prev) => (prev & bitNum ? prev & ~bitNum : prev | bitNum));
  };

  const hasChanged = useMemo(
    () => activePermissions !== originalPermissions,
    [activePermissions, originalPermissions]
  );

  const handleSave = async () => {
    setIsSaving(true);
    setTimeout(() => {
      setOriginalPermissions(activePermissions);
      setIsSaving(false);
    }, 1000);
  };

  const activeRole = localRoles.find((role) => role.id === selectedRoleId);

  return (
    <div className="w-full space-y-6 min-w-0">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Role Manager</h3>
        <p className="text-sm text-muted-foreground">
          Adjust role permissions for {guild?.name || 'this server'}.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-lg border border-border bg-card/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Roles
              </div>
              <p className="text-xs text-muted-foreground">Select a role to edit permissions.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCreateRole}
              className="gap-2"
            >
              {isCreating ? <CircleNotch size={14} className="animate-spin" /> : <Plus size={14} />}
              New Role
            </Button>
          </div>
          <Separator className="my-4" />
          <ScrollArea className="max-h-[420px] pr-2">
            <div className="space-y-2">
              {localRoles.length === 0 ? (
                <div className="rounded bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  No roles yet.
                </div>
              ) : (
                localRoles.map((role) => {
                  const isActive = selectedRoleId === role.id;
                  return (
                    <Button
                      key={role.id}
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setSelectedRoleId(role.id);
                        setActivePermissions(Number(role.permissions || 0));
                        setOriginalPermissions(Number(role.permissions || 0));
                      }}
                      className={`w-full justify-start rounded-md px-3 py-2 text-sm ${
                        isActive
                          ? 'bg-primary/10 text-primary hover:bg-primary/20'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      {role.name}
                    </Button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="rounded-lg border border-border bg-card/60 p-5 relative">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Permissions
            </div>
            <p className="text-xs text-muted-foreground">
              Editing: {activeRole?.name || 'Select a role'}
            </p>
          </div>
          <Separator className="my-4" />
          <ScrollArea className="max-h-[420px] pr-2">
            <div className="grid gap-3">
              {Object.entries(PERMISSIONS_LIST).map(([bit, label]) => {
                const isEnabled = (activePermissions & Number(bit)) !== 0;
                return (
                  <div
                    key={bit}
                    className="flex items-center justify-between rounded-md border border-border bg-background/40 px-4 py-3"
                  >
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    <Switch checked={isEnabled} onCheckedChange={() => handleToggle(bit)} />
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {hasChanged && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-4 py-3">
              <span className="text-xs text-muted-foreground">You have unsaved changes.</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActivePermissions(originalPermissions)}
                >
                  Reset
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <FloppyDisk size={16} />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServerRoleManager;
