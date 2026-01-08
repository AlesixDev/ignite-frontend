const ChannelManager = ({ guild }) => {
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
          <button
            type="button"
            className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-200 hover:bg-gray-800"
          >
            Add Channel
          </button>
        </div>
        <div className="space-y-2 text-sm text-gray-300">
          <div className="rounded bg-gray-900/60 px-3 py-2"># general (placeholder)</div>
          <div className="rounded bg-gray-900/60 px-3 py-2"># announcements (placeholder)</div>
          <div className="rounded bg-gray-900/60 px-3 py-2"># events (placeholder)</div>
        </div>
      </div>
    </div>
  );
};

export default ChannelManager;
