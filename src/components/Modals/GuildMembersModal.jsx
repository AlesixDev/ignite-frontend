import { useEffect, useState } from 'react';
import { X } from '@phosphor-icons/react';
import api from '../../api';

const GuildMembersModal = ({ open, onClose, guildId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!open || !guildId) return;

    let active = true;
    setLoading(true);
    setError('');
    setData(null);

    api.get(`/guilds/${guildId}/members`)
      .then((response) => {
        if (!active) return;
        setData(response.data);
      })
      .catch((err) => {
        if (!active) return;
        const msg = err.response?.data?.message || err.message || 'Could not load members.';
        setError(msg);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, guildId]);

  if (!open) return null;

  const members = Array.isArray(data) ? data : [];

  return (
    <div className="absolute right-4 top-full z-40 mt-2 w-72 rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-100">Members</h2>
          <p className="text-xs text-gray-400">{members.length} total</p>
        </div>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-200">
          <X className="size-5" />
        </button>
      </div>

      <div className="mt-3">
        {loading && <div className="text-xs text-gray-400">Loading...</div>}
        {error && <div className="text-xs text-red-400">{error}</div>}
        {!loading && !error && (
          <div className="max-h-64 space-y-1 overflow-auto rounded bg-gray-900/60 p-2 text-xs text-gray-100">
            {members.length === 0 ? (
              <div className="text-gray-400">No members found.</div>
            ) : (
              members.map((member) => (
                <div key={member.user_id} className="rounded bg-gray-900 px-2 py-1">
                  {member.nickname || member.user?.username || 'Unknown'}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GuildMembersModal;
