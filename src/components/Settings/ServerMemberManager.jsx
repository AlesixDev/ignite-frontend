import { useEffect, useMemo, useState } from 'react';
import api from '../../api';
import FormLabel from '../Form/FormLabel';

const ServerMemberManager = ({ guild }) => {
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedRoles, setSelectedRoles] = useState(new Set());
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

  useEffect(() => {
    if (!guild?.id || !selectedMemberId) return;

    let active = true;
    setError('');

    api.get(`/guilds/${guild.id}/members/${selectedMemberId}`)
      .then((response) => {
        if (!active) return;
        console.log('Member manager: loaded member', response.data);
        const roleIds = Array.isArray(response.data?.roles)
          ? response.data.roles.map((role) => role.id || role.role_id).filter(Boolean)
          : [];
        setSelectedRoles(new Set(roleIds));
      })
      .catch((err) => {
        if (!active) return;
        const msg = err.response?.data?.message || err.message || 'Could not load member.';
        setError(msg);
      });

    return () => {
      active = false;
    };
  }, [guild?.id, selectedMemberId]);

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

  const toggleRole = (roleId) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!guild?.id || !selectedMemberId) return;
    setSaving(true);
    setError('');

    try {
      console.log('Member manager: updating member', {
        memberId: selectedMemberId,
        roles: Array.from(selectedRoles),
      });
      await api.patch(`/guilds/${guild.id}/members/${selectedMemberId}`, {
        roles: Array.from(selectedRoles),
      });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not update member.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Member Management</h3>
        <p className="mt-1 text-sm text-gray-400">
          Assign roles to members in {guild?.name || 'this server'}.
        </p>
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-4">
        {loading && <div className="text-xs text-gray-400">Loading members...</div>}
        {error && <div className="text-xs text-red-400">{error}</div>}
        {!loading && (
          <div className="space-y-4 text-sm text-gray-300">
            <div>
              <FormLabel htmlFor="member-select">Select member</FormLabel>
              <select
                id="member-select"
                value={selectedMemberId}
                onChange={(event) => setSelectedMemberId(event.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-white focus:border-primary focus:ring-primary"
              >
                <option value="">Choose a member</option>
                {memberOptions.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedMemberId && (
              <div>
                <FormLabel>Roles</FormLabel>
                <div className="max-h-64 space-y-2 overflow-auto rounded border border-gray-800 bg-gray-900/40 p-3">
                  {roleOptions.length === 0 ? (
                    <div className="text-xs text-gray-400">No roles available.</div>
                  ) : (
                    roleOptions.map((role) => (
                      <label key={role.id} className="flex items-center gap-2 text-xs text-gray-200">
                        <input
                          type="checkbox"
                          checked={selectedRoles.has(role.id)}
                          onChange={() => toggleRole(role.id)}
                        />
                        <span>{role.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {selectedMemberId && (
              <div>
                <button
                  type="button"
                  className="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg border border-transparent bg-primary px-5 py-2.5 text-sm text-white shadow-md disabled:opacity-60"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Roles'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerMemberManager;
