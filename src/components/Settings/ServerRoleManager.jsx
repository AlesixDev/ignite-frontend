import { useEffect, useMemo, useState } from 'react';
import { CircleNotch, FloppyDisk } from '@phosphor-icons/react';
import { Plus, Shield, Users, Monitor, Trash2 } from 'lucide-react';
import api from '../../api';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '../ui/alert-dialog'; // Assuming shadcn alert-dialog is installed
import { RolesService } from '../../services/roles.service';
import { useRolesStore } from '../../stores/roles.store';
import { toast } from 'sonner';

const PERMISSIONS_LIST = {
  2: "Manage Guild",
  4: "Manage Channels",
  8: "Manage Messages",
  16: "Kick Members",
  32: "Ban Members"
};

const ServerRoleManager = ({ guild }) => {
  const [localRoles, setLocalRoles] = useState(guild?.roles ?? []);
  const [selectedRoleId, setSelectedRoleId] = useState(null);

  const [activePermissions, setActivePermissions] = useState(0);
  const [originalPermissions, setOriginalPermissions] = useState(0);
  const [roleName, setRoleName] = useState('');
  const [originalName, setOriginalName] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { guildRoles } = useRolesStore();

  useEffect(() => {
    setLocalRoles(guildRoles[guild.id] || []);
  }, [guildRoles, guild.id]);

  useEffect(() => {
    const roleToSelect = selectedRoleId
      ? localRoles.find(r => r.id === selectedRoleId)
      : localRoles[0];

    if (roleToSelect) {
      setSelectedRoleId(roleToSelect.id);
      setActivePermissions(Number(roleToSelect.permissions || 0));
      setOriginalPermissions(Number(roleToSelect.permissions || 0));
      setRoleName(roleToSelect.name || '');
      setOriginalName(roleToSelect.name || '');
    }
  }, [localRoles, selectedRoleId]);

  const handleCreateRole = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      await RolesService.createGuildRole(guild.id, {
        name: 'new role',
        permissions: 0,
      });
      toast.success("Role created");
    } catch (error) {
      toast.error("Failed to create role");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await RolesService.updateGuildRole(guild.id, selectedRoleId, {
        name: roleName,
        permissions: activePermissions,
      });
      toast.success("Role updated");
    }
    catch (error) {
      toast.error("Failed to save role");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (isDeleting || !selectedRoleId) return;
    setIsDeleting(true);
    try {
      await RolesService.deleteGuildRole(guild.id, selectedRoleId);
      toast.success("Role deleted");
      setSelectedRoleId(null); // Reset selection to first role in next render
    } catch (error) {
      toast.error("Failed to delete role");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggle = (bit) => {
    const bitNum = Number(bit);
    setActivePermissions((prev) => (prev & bitNum ? prev & ~bitNum : prev | bitNum));
  };

  const hasChanged = useMemo(
    () => activePermissions !== originalPermissions || roleName !== originalName,
    [activePermissions, originalPermissions, roleName, originalName]
  );

  const activeRole = localRoles.find((role) => role.id === selectedRoleId);

  return (
    <div className="w-full space-y-6 min-w-0">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Role Manager</h3>
        <p className="text-sm text-muted-foreground">
          Adjust role settings and permissions for {guild?.name || 'this server'}.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        {/* Left Column: Role List */}
        <div className="rounded-lg border border-border bg-card/60 p-5 h-fit">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Roles
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCreateRole}
              className="gap-2"
              disabled={isCreating}
            >
              {isCreating ? <CircleNotch size={14} className="animate-spin" /> : <Plus size={14} />}
              New Role
            </Button>
          </div>
          <ScrollArea className="h-[400px] pr-2">
            <div className="space-y-1">
              {localRoles.map((role) => (
                <Button
                  key={role.id}
                  variant="ghost"
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`w-full justify-start ${selectedRoleId === role.id ? 'bg-primary/10 text-primary' : ''
                    }`}
                >
                  {role.id === selectedRoleId ? roleName : role.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right Column: Tabs Interface */}
        <div className="rounded-lg border border-border bg-card/60 flex flex-col min-h-[520px] relative">
          <Tabs defaultValue="permissions" className="flex flex-col h-full">
            <div className="px-5 pt-5">
              <div className="mb-4 text-sm font-bold truncate">
                Editing Role: <span className="text-primary">{activeRole?.name}</span>
              </div>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="display" className="gap-2">
                  <Monitor size={14} /> Display
                </TabsTrigger>
                <TabsTrigger value="permissions" className="gap-2">
                  <Shield size={14} /> Permissions
                </TabsTrigger>
              </TabsList>
            </div>

            <Separator className="mt-4" />

            <div className="flex-1 p-5 overflow-hidden">
              {/* TAB: DISPLAY */}
              <TabsContent value="display" className="mt-0 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase text-muted-foreground">Role Name</label>
                  <Input
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="Enter role name..."
                  />
                </div>

                <Separator />

                {/* DANGER ZONE */}
                <div className="space-y-3">
                  <h5 className="text-xs font-semibold uppercase text-destructive tracking-wider">Danger Zone</h5>
                  <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Delete Role</p>
                      <p className="text-xs text-muted-foreground">This action cannot be undone. Members will lose this role.</p>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="gap-2" disabled={isDeleting}>
                          {isDeleting ? <CircleNotch size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the <span className="font-bold text-foreground">"{activeRole?.name}"</span> role.
                            All members assigned to this role will lose its associated permissions.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteRole}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Role
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </TabsContent>

              {/* TAB: PERMISSIONS */}
              <TabsContent value="permissions" className="mt-0">
                <ScrollArea className="h-[320px] pr-2">
                  <div className="grid gap-3">
                    {Object.entries(PERMISSIONS_LIST).map(([bit, label]) => (
                      <div
                        key={bit}
                        className="flex items-center justify-between rounded-md border border-border bg-background/40 px-4 py-3"
                      >
                        <span className="text-sm font-medium">{label}</span>
                        <Switch
                          checked={(activePermissions & Number(bit)) !== 0}
                          onCheckedChange={() => handleToggle(bit)}
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>

            {/* Floating Save Bar */}
            {hasChanged && (
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2 rounded-md border border-primary/20 bg-primary/5 backdrop-blur-md px-4 py-3 animate-in fade-in slide-in-from-bottom-2">
                <span className="text-xs font-medium text-primary">Careful — you have unsaved changes!</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setActivePermissions(originalPermissions);
                      setRoleName(originalName);
                    }}
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
                    {isSaving ? <CircleNotch size={14} className="animate-spin" /> : <FloppyDisk size={14} />}
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ServerRoleManager;