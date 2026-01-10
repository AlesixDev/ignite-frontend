import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import api from '../../api';
import FormError from '../Form/FormError';
import FormInput from '../Form/FormInput';
import FormLabel from '../Form/FormLabel';
import FormSubmit from '../Form/FormSubmit';

const ServerChannelManager = ({ guild, editChannelId, onEditChannelChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [channelPermissions, setChannelPermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsError, setPermissionsError] = useState('');
  const createForm = useForm({ defaultValues: { name: '', type: '0' } });
  const editForm = useForm({ defaultValues: { name: '', position: '' } });
  const permissionsForm = useForm({ defaultValues: { roleId: '', allowed: '', denied: '' } });
  const [editingChannelId, setEditingChannelId] = useState(null);

  useEffect(() => {
    if (!guild?.id) return;

    let active = true;
    setLoading(true);
    setError('');
    setChannels([]);

    Promise.all([
      api.get(`/guilds/${guild.id}/channels`),
      api.get(`/guilds/${guild.id}/roles`),
    ])
      .then(([channelsResponse, rolesResponse]) => {
        if (!active) return;
        setChannels(Array.isArray(channelsResponse.data) ? channelsResponse.data : []);
        setRoles(Array.isArray(rolesResponse.data) ? rolesResponse.data : []);
      })
      .catch((err) => {
        if (!active) return;
        const msg = err.response?.data?.message || err.message || 'Could not load channels.';
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

  const startEditChannel = (channel) => {
    const channelId = channel.channel_id || channel.id;
    setEditingChannelId(channelId);
    editForm.reset({
      name: channel.name || channel.channel_name || '',
      position: channel.position ?? '',
    });
    onEditChannelChange?.(channelId);
  };

  const handleEditChannel = async (data) => {
    if (!guild?.id || !editingChannelId) return;
    setError('');

    try {
      const params = {};
      if (data.name?.trim()) params.name = data.name.trim();
      if (String(data.position ?? '').trim()) params.position = String(data.position).trim();
      await api.patch(`/guilds/${guild.id}/channels/${editingChannelId}`, null, { params });
      setChannels((prev) =>
        prev.map((item) =>
          (item.channel_id || item.id) === editingChannelId
            ? { ...item, name: params.name ?? item.name, position: params.position ?? item.position }
            : item
        )
      );
      setEditingChannelId(null);
      editForm.reset({ name: '', position: '' });
      onEditChannelChange?.(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not update channel.';
      setError(msg);
    }
  };

  const cancelEditChannel = () => {
    setEditingChannelId(null);
    editForm.reset({ name: '', position: '' });
    permissionsForm.reset({ roleId: '', allowed: '', denied: '' });
    onEditChannelChange?.(null);
  };

  const handleDeleteChannel = async (channel) => {
    if (!guild?.id || !channel) return;
    const confirmDelete = window.confirm('Delete this channel?');
    if (!confirmDelete) return;

    setError('');

    try {
      await api.delete(`/guilds/${guild.id}/channels/${channel.channel_id || channel.id}`);
      setChannels((prev) =>
        prev.filter((item) => (item.channel_id || item.id) !== (channel.channel_id || channel.id))
      );
      if ((channel.channel_id || channel.id) === editingChannelId) {
        setEditingChannelId(null);
        editForm.reset({ name: '', position: '' });
        onEditChannelChange?.(null);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not delete channel.';
      setError(msg);
    }
  };

  const sortedChannels = [...channels].sort((a, b) => {
    const aPos = Number(a.position ?? 0);
    const bPos = Number(b.position ?? 0);
    if (aPos === bPos) {
      return String(a.name || a.channel_name || '').localeCompare(String(b.name || b.channel_name || ''));
    }
    return aPos - bPos;
  });

  const updateChannelPosition = async (channelId, nextPosition) => {
    if (!guild?.id || channelId == null) return;

    setError('');

    try {
      const params = { position: String(nextPosition) };
      await api.patch(`/guilds/${guild.id}/channels/${channelId}`, null, { params });
      setChannels((prev) =>
        prev.map((item) =>
          (item.channel_id || item.id) === channelId
            ? { ...item, position: nextPosition }
            : item
        )
      );
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not update channel position.';
      setError(msg);
    }
  };

  const moveChannel = async (channelId, direction) => {
    const currentIndex = sortedChannels.findIndex(
      (channel) => (channel.channel_id || channel.id) === channelId
    );
    if (currentIndex < 0) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedChannels.length) return;

    const channel = sortedChannels[currentIndex];
    const target = sortedChannels[targetIndex];

    const channelPos = Number(channel.position ?? 0);
    const targetPos = Number(target.position ?? 0);

    await updateChannelPosition(channelId, targetPos);
    await updateChannelPosition(target.channel_id || target.id, channelPos);
  };

  useEffect(() => {
    if (!editChannelId) {
      if (editingChannelId) cancelEditChannel();
      return;
    }

    if (editChannelId === editingChannelId) return;
    const nextChannel = channels.find(
      (channel) => (channel.channel_id || channel.id) === editChannelId
    );
    if (nextChannel) startEditChannel(nextChannel);
  }, [channels, editChannelId, editingChannelId]);

  useEffect(() => {
    if (!editingChannelId) {
      setChannelPermissions([]);
      setPermissionsError('');
      return;
    }

    let active = true;
    setPermissionsLoading(true);
    setPermissionsError('');

    api.get(`/channels/${editingChannelId}/permissions`)
      .then((response) => {
        if (!active) return;
        setChannelPermissions(Array.isArray(response.data) ? response.data : []);
      })
      .catch((err) => {
        if (!active) return;
        const msg = err.response?.data?.message || err.message || 'Could not load channel permissions.';
        setPermissionsError(msg);
      })
      .finally(() => {
        if (!active) return;
        setPermissionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [editingChannelId]);

  const roleNameById = useMemo(() => {
    return roles.reduce((acc, role) => {
      const roleId = role.id || role.role_id;
      if (roleId) acc[roleId] = role.name || role.role_name || roleId;
      return acc;
    }, {});
  }, [roles]);

  const handleAddPermission = async (data) => {
    if (!editingChannelId || !data.roleId) return;
    setPermissionsError('');

    try {
      const params = {};
      if (data.allowed?.trim()) params.allowed_permissions = data.allowed.trim();
      if (data.denied?.trim()) params.denied_permissions = data.denied.trim();
      await api.put(`/channels/${editingChannelId}/permissions/${data.roleId}`, null, { params });
      permissionsForm.reset({ roleId: '', allowed: '', denied: '' });
      const response = await api.get(`/channels/${editingChannelId}/permissions`);
      setChannelPermissions(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not update channel permissions.';
      setPermissionsError(msg);
    }
  };

  const handleRemovePermission = async (roleId) => {
    if (!editingChannelId || !roleId) return;
    setPermissionsError('');

    try {
      await api.delete(`/channels/${editingChannelId}/permissions/${roleId}`);
      setChannelPermissions((prev) =>
        prev.filter((perm) => (perm.role_id || perm.id || perm.roleId) !== roleId)
      );
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not remove channel permission.';
      setPermissionsError(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Channel Manager</h3>
        <p className="mt-1 text-sm text-gray-400">
          Placeholder channel groups and actions for {guild?.name || 'this server'}.
        </p>
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium">Channels</div>
        </div>
        <FormProvider {...createForm}>
          <form
            onSubmit={createForm.handleSubmit(async (data) => {
              if (!guild?.id) return;
              setError('');
              try {
                const response = await api.post(`/guilds/${guild.id}/channels`, data);
                setChannels((prev) => [...prev, response.data]);
                createForm.reset({ name: '', type: '0' });
              } catch (err) {
                const msg = err.response?.data?.message || err.message || 'Could not create channel.';
                setError(msg);
              }
            })}
            className="mb-4 grid gap-3 text-xs text-gray-300 sm:grid-cols-[1fr_auto] sm:items-end"
          >
            <input type="hidden" name="type" value="0" {...createForm.register('type')} />
            <div>
              <FormLabel htmlFor="channel-name">Channel name</FormLabel>
              <FormInput
                id="channel-name"
                type="text"
                name="name"
                placeholder="general"
                validation={{ required: 'Channel name is required.' }}
                className="text-xs"
              />
              <FormError name="name" />
            </div>
            <FormSubmit form={createForm} label="Add Channel" />
          </form>
        </FormProvider>
        {editingChannelId && (
          <FormProvider {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(handleEditChannel)}
              className="mb-4 rounded border border-gray-800 bg-gray-900/40 p-3 text-xs text-gray-300"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FormLabel htmlFor="edit-channel-name">Channel name</FormLabel>
                  <FormInput
                    id="edit-channel-name"
                    type="text"
                    name="name"
                    placeholder="general"
                    validation={{ required: 'Channel name is required.' }}
                    className="text-xs"
                  />
                  <FormError name="name" />
                </div>
                <div>
                  <FormLabel htmlFor="edit-channel-position" help="Optional">
                    Position
                  </FormLabel>
                  <FormInput
                    id="edit-channel-position"
                    type="text"
                    name="position"
                    placeholder="0"
                    className="text-xs"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <FormSubmit form={editForm} label="Save" />
                <button
                  type="button"
                  className="rounded border border-gray-700 px-3 py-2 text-xs text-gray-200 hover:bg-gray-800"
                  onClick={cancelEditChannel}
                >
                  Cancel
                </button>
              </div>
            </form>
          </FormProvider>
        )}
        {editingChannelId && (
          <div className="mb-4 rounded border border-gray-800 bg-gray-900/40 p-3 text-xs text-gray-300">
            <FormProvider {...permissionsForm}>
              <form onSubmit={permissionsForm.handleSubmit(handleAddPermission)} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                <div>
                  <FormLabel htmlFor="permission-role">Role</FormLabel>
                  <select
                    id="permission-role"
                    {...permissionsForm.register('roleId', { required: true })}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-white"
                  >
                    <option value="">Select role</option>
                    {roles.map((role) => (
                      <option key={role.id || role.role_id} value={role.id || role.role_id}>
                        {role.name || role.role_name || 'Unnamed role'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FormLabel htmlFor="permission-allowed">Allowed</FormLabel>
                  <FormInput
                    id="permission-allowed"
                    type="text"
                    name="allowed"
                    placeholder="4"
                    className="text-xs"
                  />
                </div>
                <div>
                  <FormLabel htmlFor="permission-denied">Denied</FormLabel>
                  <FormInput
                    id="permission-denied"
                    type="text"
                    name="denied"
                    placeholder="0"
                    className="text-xs"
                  />
                </div>
                <FormSubmit form={permissionsForm} label="Add Permission" />
              </form>
            </FormProvider>
            {permissionsLoading && <div className="mt-2 text-xs text-gray-400">Loading permissions...</div>}
            {permissionsError && <div className="mt-2 text-xs text-red-400">{permissionsError}</div>}
            {!permissionsLoading && !permissionsError && (
              <div className="mt-3 space-y-2">
                {channelPermissions.length === 0 ? (
                  <div className="text-xs text-gray-400">No permissions assigned.</div>
                ) : (
                  channelPermissions.map((perm) => {
                    const roleId = perm.role_id || perm.id || perm.roleId;
                    return (
                      <div
                        key={roleId}
                        className="flex items-center justify-between rounded border border-gray-800 bg-gray-950/40 px-3 py-2"
                      >
                        <div className="text-xs text-gray-200">
                          {roleNameById[roleId] || roleId}
                          <span className="ml-2 text-[10px] text-gray-500">
                            allowed: {perm.allowed_permissions ?? perm.allowed ?? 0} | denied:{' '}
                            {perm.denied_permissions ?? perm.denied ?? 0}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="rounded border border-red-500/60 px-2 py-1 text-[10px] text-red-200 hover:bg-red-500/10"
                          onClick={() => handleRemovePermission(roleId)}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
        {loading && <div className="text-xs text-gray-400">Loading channels...</div>}
        {error && <div className="text-xs text-red-400">{error}</div>}
        {!loading && !error && (
          <div className="space-y-2 text-sm text-gray-300">
            {sortedChannels.length === 0 ? (
              <div className="rounded bg-gray-900/60 px-3 py-2 text-xs text-gray-400">
                No channels found.
              </div>
            ) : (
              sortedChannels.map((channel, index) => (
                <div
                  key={channel.channel_id || channel.id || channel.name}
                  className="flex items-center justify-between rounded bg-gray-900/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate">#{channel.name || channel.channel_name || 'unnamed'}</div>
                    <div className="text-[10px] text-gray-500">Position: {Number(channel.position ?? 0)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded border border-gray-700 px-2 py-1 text-[10px] text-gray-200 hover:bg-gray-800 disabled:opacity-50"
                      onClick={() => moveChannel(channel.channel_id || channel.id, 'up')}
                      disabled={index === 0}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="rounded border border-gray-700 px-2 py-1 text-[10px] text-gray-200 hover:bg-gray-800 disabled:opacity-50"
                      onClick={() => moveChannel(channel.channel_id || channel.id, 'down')}
                      disabled={index === sortedChannels.length - 1}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      className="rounded border border-gray-700 px-2 py-1 text-[10px] text-gray-200 hover:bg-gray-800"
                      onClick={() => startEditChannel(channel)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded border border-red-500/60 px-2 py-1 text-[10px] text-red-200 hover:bg-red-500/10"
                      onClick={() => handleDeleteChannel(channel)}
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

export default ServerChannelManager;
