import { useEffect, useMemo, useState } from 'react';
import api from '../../api';
import FormLabel from '../Form/FormLabel';

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
            {memberOptions.length === 0 ? (
              <div className="text-xs text-gray-400">No members found.</div>
            ) : (
              <div className="overflow-x-auto rounded border border-gray-800">
                <table className="min-w-[520px] text-left text-xs text-gray-300">
                  <thead className="bg-gray-900/60 text-[10px] uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Member</th>
                      <th className="px-3 py-2">Roles</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberOptions.map((member) => {
                      const assignedRoles = memberRoles[member.id] || new Set();
                      return (
                        <tr key={member.id} className="border-t border-gray-800">
                          <td className="px-3 py-2 text-sm text-gray-100 break-words">{member.name}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              {roleOptions.length === 0 && (
                                <span className="text-[10px] text-gray-500">No roles</span>
                              )}
                              {roleOptions.map((role) => (
                                <span
                                  key={role.id}
                                  className={`break-words rounded border px-2 py-0.5 text-[10px] ${
                                    assignedRoles.has(role.id)
                                      ? 'border-primary/60 bg-primary/10 text-primary'
                                      : 'border-gray-700 text-gray-400'
                                  }`}
                                >
                                  {role.name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              className="rounded border border-gray-700 px-2 py-1 text-[10px] text-gray-200 hover:bg-gray-800"
                              onClick={() =>
                                setEditingMemberId((current) =>
                                  current === member.id ? null : member.id
                                )
                              }
                            >
                              {editingMemberId === member.id ? 'Close' : 'Edit Roles'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {editingMemberId && (
              <div className="rounded border border-gray-800 bg-gray-900/40 p-3">
                <FormLabel>Update roles</FormLabel>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {roleOptions.length === 0 ? (
                    <div className="text-xs text-gray-400">No roles available.</div>
                  ) : (
                    roleOptions.map((role) => (
                      <label key={role.id} className="flex items-center gap-2 text-xs text-gray-200">
                        <input
                          type="checkbox"
                          checked={(memberRoles[editingMemberId] || new Set()).has(role.id)}
                          onChange={() => toggleRole(editingMemberId, role.id)}
                        />
                        <span>{role.name}</span>
                      </label>
                    ))
                  )}
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    className="inline-flex w-full min-w-32 items-center justify-center gap-2 rounded-lg border border-transparent bg-primary px-5 py-2.5 text-sm text-white shadow-md disabled:opacity-60 sm:w-auto"
                    onClick={() => handleSave(editingMemberId)}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Roles'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerMemberManager;
