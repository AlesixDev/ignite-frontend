import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, CircleNotch, FloppyDisk, X } from '@phosphor-icons/react';
import api from '../../api';

import { Switch } from "../../components/ui/switch";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import { Plus } from 'lucide-react';

const PERMISSIONS_LIST = {
  2: "Manage Guild",
  4: "Manage Channels",
  8: "Manage Messages",
  16: "Kick Members",
  32: "Ban Members",
  64: "Create Instant Invite",
  128: "Change Nickname",
  256: "Manage Nicknames",
};

const ServerRoleManager = ({ guild }) => {
  const rolesList = guild?.roles ?? [];

  // State for the bitfield
  const [localRoles, setLocalRoles] = useState(guild?.roles ?? []);
  const [activePermissions, setActivePermissions] = useState(0);
  const [originalPermissions, setOriginalPermissions] = useState(0);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (guild?.roles) setLocalRoles(guild.roles);
  }, [guild?.roles]);

  // Sync state when role changes
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
        name: "new role",
        permissions: 0
      });

      const newRole = response.data; // Assuming API returns the created role object

      setLocalRoles(prev => [...prev, newRole]);
      setSelectedRoleId(newRole.id);
      setActivePermissions(0);
      setOriginalPermissions(0);
    } catch (error) {
      console.error("Failed to create role:", error);
      // Optional: Add toast notification here
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggle = (bit) => {
    const bitNum = Number(bit);
    setActivePermissions(prev =>
      (prev & bitNum) ? (prev & ~bitNum) : (prev | bitNum)
    );
  };

  const hasChanged = useMemo(() => activePermissions !== originalPermissions, [activePermissions, originalPermissions]);

  const handleSave = async () => {
    setIsSaving(true);
    // Mock API call
    setTimeout(() => {
      setOriginalPermissions(activePermissions);
      setIsSaving(false);
    }, 1000);
  };

  return (
    <div className="flex h-[550px] w-full overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xl">

      {/* Sidebar: Role Selection */}
      <div className="w-56 flex flex-col bg-muted/30 border-r border-border">
        <div className="p-4 pb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Roles
          </h2>
          {/* 3. Create Role Button */}
          <button
            onClick={handleCreateRole}
            className="p-1 hover:bg-accent rounded-full transition-colors text-muted-foreground hover:text-accent-foreground"
            title="Create Role"
          >
            {isCreating ? (
              <CircleNotch size={14} className="animate-spin" />
            ) : (
              <Plus size={14} weight="bold" />
            )}
          </button>
        </div>
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 py-2">
            {localRoles.map((role) => (
              <button
                key={role.id}
                onClick={() => {
                  setSelectedRoleId(role.id);
                  setActivePermissions(Number(role.permissions || 0));
                  setOriginalPermissions(Number(role.permissions || 0));
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all ${selectedRoleId === role.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'hover:bg-accent text-muted-foreground hover:text-accent-foreground'
                  }`}
              >
                {role.name}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content: Permissions */}
      <div className="flex-1 flex flex-col relative">
        <div className="p-6">
          <h3 className="text-xl font-bold tracking-tight">
            {localRoles.find(r => r.id === selectedRoleId)?.name} Permissions
          </h3>
          {/* <p className="text-sm text-muted-foreground mt-1">
            Toggle bits on the permission bitfield for this role.
          </p> */}
        </div>

        <Separator />

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            <div className="grid gap-4">
              {Object.entries(PERMISSIONS_LIST).map(([bit, label]) => {
                const isEnabled = (activePermissions & Number(bit)) !== 0;
                return (
                  <div
                    key={bit}
                    className="flex items-center justify-between space-x-4 rounded-lg p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="space-y-0.5">
                      <text className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {label}
                      </text>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => handleToggle(bit)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>

        {/* Floating Save Notification (Discord Style) */}
        {hasChanged && (
          <div className="absolute bottom-4 left-4 right-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-popover border border-border rounded-lg p-3 flex items-center justify-between shadow-2xl">
              <span className="text-sm font-medium">Careful — you have unsaved changes!</span>
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
                  className="bg-green-600 hover:bg-green-700 text-white gap-2"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <FloppyDisk size={16} />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerRoleManager;