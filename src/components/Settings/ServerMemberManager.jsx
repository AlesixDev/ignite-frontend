import { useEffect, useMemo, useState } from 'react';
import api from '../../api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';

const ServerMemberManager = ({ guild }) => {
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [memberRoles, setMemberRoles] = useState({});
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!guild?.id) return;

    let active = true;
    setLoading(true);
    setError('');

    Promise.all([
      api.get(`/guilds/${guild.id}/members/`),
      api.get(`/guilds/${guild.id}/roles`),
    ])
      .then(([membersResponse, rolesResponse]) => {
        if (!active) return;
        const membersData = Array.isArray(membersResponse.data) ? membersResponse.data : [];
        const rolesData = Array.isArray(rolesResponse.data) ? rolesResponse.data : [];
        console.log('Member manager: loaded members', membersData);
        console.log('Member manager: loaded roles', rolesData);
        setMembers(membersData);
        setRoles(rolesData);
        const initialRoles = membersData.reduce((acc, member) => {
          const roleIds = Array.isArray(member.roles)
            ? member.roles.map((role) => role.id || role.role_id).filter(Boolean)
            : [];
          const memberId = member.user_id || member.id;
          if (memberId) {
            acc[memberId] = new Set(roleIds);
          }
          return acc;
        }, {});
        setMemberRoles(initialRoles);
      })
      .catch((err) => {
        if (!active) return;
        const msg = err.response?.data?.message || err.message || 'Could not load members or roles.';
        setError(msg);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [guild?.id]);

  const memberOptions = useMemo(
    () =>
      members.map((member) => ({
        id: member.user_id || member.id,
        name: member.nickname || member.user?.username || member.username || 'Unknown',
      })),
    [members]
  );

  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({
        id: role.id || role.role_id,
        name: role.name || role.role_name || 'Unnamed role',
      })),
    [roles]
  );

  const toggleRole = (memberId, roleId) => {
    setMemberRoles((prev) => {
      const memberSet = new Set(prev[memberId] || []);
      if (memberSet.has(roleId)) {
        memberSet.delete(roleId);
      } else {
        memberSet.add(roleId);
      }
      return { ...prev, [memberId]: memberSet };
    });
  };

  const handleSave = async (memberId) => {
    if (!guild?.id || !memberId) return;
    setSaving(true);
    setError('');

    try {
      console.log('Member manager: updating member', {
        memberId,
        roles: Array.from(memberRoles[memberId] || []),
      });
      await api.patch(`/guilds/${guild.id}/members/${memberId}`, {
        roles: Array.from(memberRoles[memberId] || []),
      });
      setEditingMemberId(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not update member.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6 min-w-0">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Member Management</h3>
        <p className="text-sm text-muted-foreground">
          Assign roles to members in {guild?.name || 'this server'}.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-lg border border-border bg-card/60 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Members
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Select a member to edit their role assignments.
          </p>
          <Separator className="my-4" />
          {loading && <div className="text-xs text-muted-foreground">Loading members...</div>}
          {error && <div className="text-xs text-destructive">{error}</div>}
          {!loading && (
            <ScrollArea className="max-h-[420px] pr-2">
              <div className="space-y-3">
                {memberOptions.length === 0 ? (
                  <div className="rounded bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    No members found.
                  </div>
                ) : (
                  memberOptions.map((member) => {
                    const assignedRoles = memberRoles[member.id] || new Set();
                    const isActive = editingMemberId === member.id;
                    return (
                      <div
                        key={member.id}
                        className={`rounded-md border p-3 transition ${
                          isActive ? 'border-primary/60 bg-primary/10' : 'border-border bg-background/40'
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-foreground break-words">
                              {member.name}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {roleOptions.length === 0 && (
                                <span className="text-[10px] text-muted-foreground">No roles</span>
                              )}
                              {roleOptions.map((role) => (
                                <Badge
                                  key={role.id}
                                  variant={assignedRoles.has(role.id) ? 'default' : 'outline'}
                                  className={assignedRoles.has(role.id) ? '' : 'text-muted-foreground'}
                                >
                                  {role.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant={isActive ? 'default' : 'outline'}
                            size="sm"
                            onClick={() =>
                              setEditingMemberId((current) => (current === member.id ? null : member.id))
                            }
                          >
                            {isActive ? 'Editing' : 'Edit Roles'}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card/60 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Role Editor
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Toggle roles and save changes.
          </p>
          <Separator className="my-4" />
          {editingMemberId ? (
            <>
              <Label className="text-xs text-muted-foreground">Update roles</Label>
              <ScrollArea className="mt-3 max-h-[360px] pr-2">
                <div className="grid gap-2">
                  {roleOptions.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No roles available.</div>
                  ) : (
                    roleOptions.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2"
                      >
                        <span className="text-xs text-foreground">{role.name}</span>
                        <Switch
                          checked={(memberRoles[editingMemberId] || new Set()).has(role.id)}
                          onCheckedChange={() => toggleRole(editingMemberId, role.id)}
                        />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              <div className="mt-4 flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => handleSave(editingMemberId)}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Roles'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingMemberId(null)}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-xs text-muted-foreground">
              Select a member on the left to edit their roles.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServerMemberManager;
