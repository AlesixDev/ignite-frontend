import { useCallback, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import api from '../../api';
import FormInput from '../Form/FormInput';
import FormLabel from '../Form/FormLabel';
import FormSubmit from '../Form/FormSubmit';

const ServerInviteManager = ({ guild }) => {
  const [invites, setInvites] = useState([]);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const createForm = useForm({ defaultValues: { expires_at: '', max_uses: '', channel_id: '' } });

  const fetchInvites = useCallback(async () => {
    if (!guild?.id) return;
    setLoading(true);
    setError('');

    try {
      const response = await api.get(`/guilds/${guild.id}/invites`);
      const data = Array.isArray(response.data) ? response.data : [];
      console.log('Invites response:', response.data);
      setInvites(data);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not load invites.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [guild?.id]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const parseExpiryInput = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const isoCandidate = Date.parse(trimmed);
    if (!Number.isNaN(isoCandidate)) {
      return new Date(isoCandidate).toISOString();
    }
    const match = /^(\d+)\s*([smhdwy])$/i.exec(trimmed);
    if (!match) return null;
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
      y: 365 * 24 * 60 * 60 * 1000,
    };
    if (!multipliers[unit]) return null;
    return new Date(Date.now() + amount * multipliers[unit]).toISOString();
  };

  const handleCreateInvite = async (data) => {
    if (!guild?.id) return;
    setLoading(true);
    setError('');

    try {
      const params = {};
      if (data.expires_at?.trim()) {
        const parsedExpiry = parseExpiryInput(data.expires_at);
        if (!parsedExpiry) {
          setError('Expiry must be an ISO date or a duration like 1h, 1d, 1w, 1y.');
          setLoading(false);
          return;
        }
        params.expires_at = parsedExpiry;
      }
      if (data.max_uses?.trim()) params.max_uses = data.max_uses.trim();
      if (data.channel_id?.trim()) params.channel_id = data.channel_id.trim();
      await api.post(`/guilds/${guild.id}/invites`, params);
      createForm.reset({ expires_at: '', max_uses: '', channel_id: '' });
      await fetchInvites();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not create invite.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvite = async (inviteId) => {
    if (!guild?.id || !inviteId) return;
    setDetailLoading(true);
    setDetailError('');

    try {
      const response = await api.get(`/guilds/${guild.id}/invites/${inviteId}`);
      console.log('Invite detail response:', response.data);
      setSelectedInvite(response.data);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not load invite.';
      setDetailError(msg);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteInvite = async (inviteId) => {
    if (!guild?.id || !inviteId) return;
    const confirmDelete = window.confirm('Delete this invite?');
    if (!confirmDelete) return;

    setLoading(true);
    setError('');

    try {
      await api.delete(`/guilds/${guild.id}/invites/${inviteId}`);
      setInvites((prev) => prev.filter((invite) => (invite.id || invite.code) !== inviteId));
      if (selectedInvite && (selectedInvite.id || selectedInvite.code) === inviteId) {
        setSelectedInvite(null);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not delete invite.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Invites</h3>
        <p className="mt-1 text-sm text-gray-400">
          Manage invite links for {guild?.name || 'this server'}.
        </p>
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium">Invites</div>
        </div>
        <FormProvider {...createForm}>
          <form
            onSubmit={createForm.handleSubmit(handleCreateInvite)}
            className="mb-4 grid gap-3 text-xs text-gray-300 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center"
          >
            <div>
              <FormLabel htmlFor="invite-expires" help="ISO timestamp or duration (e.g. 1h, 1d, 1w, 1y)">
                Expiry
              </FormLabel>
              <FormInput
                id="invite-expires"
                type="text"
                name="expires_at"
                placeholder="1d or 2026-01-10T19:58:25Z"
                size="sm"
                className="text-xs"
              />
            </div>
            <div>
              <FormLabel htmlFor="invite-max-uses">Max uses</FormLabel>
              <FormInput
                id="invite-max-uses"
                type="text"
                name="max_uses"
                placeholder="0"
                size="sm"
                className="text-xs"
              />
            </div>
            <div>
              <FormLabel htmlFor="invite-channel">Channel ID</FormLabel>
              <FormInput
                id="invite-channel"
                type="text"
                name="channel_id"
                placeholder="Optional"
                size="sm"
                className="text-xs"
              />
            </div>
            <FormSubmit form={createForm} label="Create Invite" className="w-full sm:w-auto" />
          </form>
        </FormProvider>
        {loading && <div className="text-xs text-gray-400">Loading invites...</div>}
        {error && <div className="text-xs text-red-400">{error}</div>}
        {!loading && !error && (
          <div className="space-y-2 text-sm text-gray-300">
            {invites.length === 0 ? (
              <div className="rounded bg-gray-900/60 px-3 py-2 text-xs text-gray-400">
                No invites found.
              </div>
            ) : (
              invites.map((invite) => {
                const inviteId = invite.id || invite.code;
                const inviteCode = invite.code || inviteId;
                const createdAt = invite.created_at ? new Date(invite.created_at).toLocaleString() : 'Unknown';
                return (
                  <div
                    key={inviteId}
                    className="flex flex-col gap-2 rounded bg-gray-900/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="break-words text-xs text-gray-200">
                        {inviteCode}
                      </div>
                      <div className="break-words text-[10px] text-gray-500">
                        Uses: {invite.uses ?? 0} · Max: {invite.max_uses ?? '∞'} · Expires:{' '}
                        {invite.expires_at ? new Date(invite.expires_at).toLocaleString() : 'Never'}
                      </div>
                      <div className="break-words text-[10px] text-gray-500">
                        Created: {createdAt} · Channel: {invite.channel_id || 'None'}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="rounded border border-gray-700 px-2 py-1 text-[10px] text-gray-200 hover:bg-gray-800"
                        onClick={() => handleViewInvite(inviteId)}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="rounded border border-red-500/60 px-2 py-1 text-[10px] text-red-200 hover:bg-red-500/10"
                        onClick={() => handleDeleteInvite(inviteId)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
        <div className="mt-4 rounded border border-gray-800 bg-gray-900/40 p-3 text-xs text-gray-200">
          <div className="mb-2 text-xs font-semibold text-gray-100">Invite Details</div>
          {detailLoading && <div className="text-xs text-gray-400">Loading invite...</div>}
          {detailError && <div className="text-xs text-red-400">{detailError}</div>}
          {!detailLoading && !detailError && (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-[11px] text-gray-300">
              {selectedInvite ? JSON.stringify(selectedInvite, null, 2) : 'Select an invite to view details.'}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServerInviteManager;
