import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

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
    <div className="w-full space-y-6 min-w-0">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Invites</h3>
        <p className="text-sm text-muted-foreground">
          Manage invite links for {guild?.name || 'this server'}.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="rounded-lg border border-border bg-card/60 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Create Invite
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Set optional limits before generating a new link.
          </p>
          <Separator className="my-4" />
          <form
            onSubmit={createForm.handleSubmit(handleCreateInvite)}
            className="grid gap-4 text-xs text-muted-foreground"
          >
            <div className="space-y-1">
              <Label htmlFor="invite-expires">Expiry</Label>
              <p className="text-[10px] text-muted-foreground">
                ISO timestamp or duration (e.g. 1h, 1d, 1w, 1y)
              </p>
              <Input
                id="invite-expires"
                type="text"
                placeholder="1d or 2026-01-10T19:58:25Z"
                className="text-xs"
                {...createForm.register('expires_at')}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="invite-max-uses">Max uses</Label>
                <Input
                  id="invite-max-uses"
                  type="text"
                  placeholder="0"
                  className="text-xs"
                  {...createForm.register('max_uses')}
                />
              </div>
              <div>
                <Label htmlFor="invite-channel">Channel ID</Label>
                <Input
                  id="invite-channel"
                  type="text"
                  placeholder="Optional"
                  className="text-xs"
                  {...createForm.register('channel_id')}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit">Create Invite</Button>
              {loading && <span className="text-xs text-muted-foreground">Creating...</span>}
            </div>
            {error && <div className="text-xs text-destructive">{error}</div>}
          </form>
        </div>

        <div className="rounded-lg border border-border bg-card/60 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Active Invites
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Track usage and manage existing links.
          </p>
          <Separator className="my-4" />
          {loading && <div className="text-xs text-muted-foreground">Loading invites...</div>}
          {!loading && (
            <ScrollArea className="max-h-[320px] pr-2">
              <div className="space-y-3 text-sm">
                {invites.length === 0 ? (
                  <div className="rounded bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    No invites found.
                  </div>
                ) : (
                  invites.map((invite) => {
                    const inviteId = invite.id || invite.code;
                    const inviteCode = invite.code || inviteId;
                    const createdAt = invite.created_at
                      ? new Date(invite.created_at).toLocaleString()
                      : 'Unknown';
                    return (
                      <div
                        key={inviteId}
                        className="rounded-md border border-border bg-background/40 p-3"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 space-y-1">
                            <div className="break-words text-sm font-medium text-foreground">
                              {inviteCode}
                            </div>
                            <div className="break-words text-[10px] text-muted-foreground">
                              Uses: {invite.uses ?? 0} | Max: {invite.max_uses ?? 'Unlimited'} | Expires:{' '}
                              {invite.expires_at ? new Date(invite.expires_at).toLocaleString() : 'Never'}
                            </div>
                            <div className="break-words text-[10px] text-muted-foreground">
                              Created: {createdAt} | Channel: {invite.channel_id || 'None'}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewInvite(inviteId)}
                            >
                              View
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteInvite(inviteId)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card/60 p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Invite Details
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Inspect a selected invite payload.
        </p>
        <Separator className="my-4" />
        {detailLoading && <div className="text-xs text-muted-foreground">Loading invite...</div>}
        {detailError && <div className="text-xs text-destructive">{detailError}</div>}
        {!detailLoading && !detailError && (
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-[11px] text-muted-foreground">
            {selectedInvite ? JSON.stringify(selectedInvite, null, 2) : 'Select an invite to view details.'}
          </pre>
        )}
      </div>
    </div>
  );
};

export default ServerInviteManager;
