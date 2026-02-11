import { useCallback, useEffect, useState, useMemo } from 'react';
import api from '../../api';
import { Button } from '../ui/button';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 10;

const ServerInviteManager = ({ guild }) => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchInvites = useCallback(async () => {
    if (!guild?.id) return;
    setLoading(true);
    setError('');

    try {
      const response = await api.get(`/guilds/${guild.id}/invites`);
      const data = Array.isArray(response.data) ? response.data : [];
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

  const totalPages = Math.ceil(invites.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedInvites = useMemo(() => {
    return invites.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [invites, startIndex]);

  const handleDeleteInvite = async (inviteId) => {
    if (!guild?.id || !inviteId) return;
    // Unimplemented
    toast.error('Revoking invites is not implemented yet.');
    return;

    const confirmDelete = window.confirm('Revoke this invite?');
    if (!confirmDelete) return;

    setLoading(true);
    setError('');

    try {
      await api.delete(`/guilds/${guild.id}/invites/${inviteId}`);
      setInvites((prev) => prev.filter((invite) => (invite.id || invite.code) !== inviteId));
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not delete invite.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-full space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Invites</h2>
        <p className="text-sm text-muted-foreground">
          View and manage invite links for {guild?.name || 'this server'}.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Active Invites Table */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Active Invite Links</h3>
        {loading && <div className="text-sm text-muted-foreground">Loading invites...</div>}
        {!loading && (
          <>
            <div className="rounded-md border border-border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Uses
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Expires
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Created
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedInvites.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-12 text-center text-sm text-muted-foreground">
                          No active invites found.
                        </td>
                      </tr>
                    ) : (
                      paginatedInvites.map((invite) => {
                        const inviteId = invite.id || invite.code;
                        const inviteCode = invite.code || inviteId;
                        return (
                          <tr key={inviteId} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <code className="rounded bg-muted px-2 py-1 text-xs font-mono">
                                {inviteCode}
                              </code>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {invite.uses ?? 0} / {invite.max_uses ?? '∞'}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {invite.expires_at
                                ? new Date(invite.expires_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : 'Never'}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {invite.created_at
                                ? new Date(invite.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : 'Unknown'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteInvite(inviteId)}
                                className="text-destructive hover:text-destructive"
                              >
                                Revoke
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, invites.length)} of{' '}
                  {invites.length} invites
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <Button
                            key={page}
                            type="button"
                            variant={currentPage === page ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="min-w-[2.5rem]"
                          >
                            {page}
                          </Button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <span key={page} className="px-2 text-muted-foreground">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ServerInviteManager;
