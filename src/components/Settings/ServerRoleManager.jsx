import { useCallback, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import api from '../../api';
import FormError from '../Form/FormError';
import FormInput from '../Form/FormInput';
import FormLabel from '../Form/FormLabel';
import FormToggle from '../Form/FormToggle';
import FormSubmit from '../Form/FormSubmit';

const ServerRoleManager = ({ guild }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rolesResponse, setRolesResponse] = useState(null);
  const createForm = useForm({ defaultValues: { name: '', permissions: '', mentionable: false } });
  const editForm = useForm({ defaultValues: { name: '', permissions: '', mentionable: false } });
  const [editingRoleId, setEditingRoleId] = useState(null);

  const fetchRoles = useCallback(async () => {
    if (!guild?.id) return;
    setLoading(true);
    setError('');
    setRolesResponse(null);

    try {
      const response = await api.get(`/guilds/${guild.id}/roles`);
      setRolesResponse(response.data);
      console.log('Roles response:', response.data);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not load roles.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [guild?.id]);

  useEffect(() => {
    if (!guild?.id) return;

    fetchRoles();

  }, [fetchRoles, guild?.id]);

  const handleAddRole = async (data) => {
    if (!guild?.id || !data.name?.trim()) return;
    setLoading(true);
    setError('');

    try {
      const params = { name: data.name.trim() };
      if (data.permissions?.trim()) {
        params.permissions = data.permissions.trim();
      }
      if (typeof data.mentionable === 'boolean') {
        params.mentionable = data.mentionable ? 1 : 0;
      }
      await api.post(`/guilds/${guild.id}/roles`, null, { params });
      createForm.reset({ name: '', permissions: '', mentionable: false });
      await fetchRoles();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not create role.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const startEditRole = (role) => {
    const roleId = role.id || role.role_id;
    setEditingRoleId(roleId);
    editForm.reset({
      name: role.name || role.role_name || '',
      permissions: role.permissions ?? '',
      mentionable: Boolean(role.mentionable),
    });
  };

  const cancelEditRole = () => {
    setEditingRoleId(null);
    editForm.reset({ name: '', permissions: '' });
  };

  const handleEditRole = async (data) => {
    if (!guild?.id || !editingRoleId) return;
    setLoading(true);
    setError('');

    try {
      const params = {};
      if (data.name?.trim()) params.name = data.name.trim();
      if (data.permissions?.trim()) params.permissions = data.permissions.trim();
      params.mentionable = data.mentionable ? 1 : 0;
      await api.patch(`/guilds/${guild.id}/roles/${editingRoleId}`, null, { params });
      await fetchRoles();
      setEditingRoleId(null);
      editForm.reset({ name: '', permissions: '', mentionable: false });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not update role.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!guild?.id || !roleId) return;
    const confirmDelete = window.confirm('Delete this role?');
    if (!confirmDelete) return;

    setLoading(true);
    setError('');

    try {
      await api.delete(`/guilds/${guild.id}/roles/${roleId}`);
      await fetchRoles();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not delete role.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const roles = Array.isArray(rolesResponse) ? rolesResponse : [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Role Manager</h3>
        <p className="mt-1 text-sm text-gray-400">
          Placeholder role list and actions for {guild?.name || 'this server'}.
        </p>
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium">Roles</div>
        </div>
        <FormProvider {...createForm}>
          <form onSubmit={createForm.handleSubmit(handleAddRole)} className="mb-4 grid gap-3 text-xs text-gray-300 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <FormLabel htmlFor="role-name">Role name</FormLabel>
              <FormInput
                id="role-name"
                type="text"
                name="name"
                placeholder="Role name"
                validation={{ required: 'Role name is required.' }}
                className="text-xs"
              />
              <FormError name="name" />
            </div>
            <div>
              <FormLabel htmlFor="role-permissions" help="Optional">
                Permissions
              </FormLabel>
              <FormInput
                id="role-permissions"
                type="text"
                name="permissions"
                placeholder="Permissions"
                className="text-xs"
              />
            </div>
            <div className="flex items-center">
              <FormToggle name="mentionable" label="Mentionable" />
            </div>
            <FormSubmit form={createForm} label="Add Role" />
          </form>
        </FormProvider>
        {editingRoleId && (
          <FormProvider {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(handleEditRole)}
              className="mb-4 rounded border border-gray-800 bg-gray-900/40 p-3 text-xs text-gray-300"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FormLabel htmlFor="edit-role-name">Role name</FormLabel>
                  <FormInput
                    id="edit-role-name"
                    type="text"
                    name="name"
                    placeholder="Role name"
                    validation={{ required: 'Role name is required.' }}
                    className="text-xs"
                  />
                  <FormError name="name" />
                </div>
                <div>
                  <FormLabel htmlFor="edit-role-permissions" help="Optional">
                    Permissions
                  </FormLabel>
                  <FormInput
                    id="edit-role-permissions"
                    type="text"
                    name="permissions"
                    placeholder="Permissions"
                    className="text-xs"
                  />
                </div>
              </div>
              <div className="mt-3">
                <FormToggle name="mentionable" label="Mentionable" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <FormSubmit form={editForm} label="Save" />
                <button
                  type="button"
                  className="rounded border border-gray-700 px-3 py-2 text-xs text-gray-200 hover:bg-gray-800"
                  onClick={cancelEditRole}
                >
                  Cancel
                </button>
              </div>
            </form>
          </FormProvider>
        )}
        {loading && <div className="text-xs text-gray-400">Loading roles...</div>}
        {error && <div className="text-xs text-red-400">{error}</div>}
        {!loading && !error && (
          <div className="space-y-2 text-sm text-gray-300">
            {roles.length === 0 ? (
              <div className="rounded bg-gray-900/60 px-3 py-2 text-xs text-gray-400">
                No roles found.
              </div>
            ) : (
              roles.map((role) => (
                <div
                  key={role.id || role.role_id || role.name}
                  className="flex items-center justify-between rounded bg-gray-900/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs text-gray-200">
                      {role.name || role.role_name || 'Unnamed role'}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      Permissions: {role.permissions ?? 0} · Mentionable: {role.mentionable ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded border border-gray-700 px-2 py-1 text-[10px] text-gray-200 hover:bg-gray-800"
                      onClick={() => startEditRole(role)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded border border-red-500/60 px-2 py-1 text-[10px] text-red-200 hover:bg-red-500/10"
                      onClick={() => handleDeleteRole(role.id || role.role_id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerRoleManager;
