const UserConnections = ({ user }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Connections</h3>
        <p className="mt-1 text-sm text-gray-400">
          Link external accounts to {user?.username || 'your profile'}.
        </p>
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-4">
        <div className="mb-3 text-sm font-medium">Discord</div>
        <div className="flex items-center justify-between gap-4 rounded-md border border-gray-800 bg-gray-900/60 px-4 py-3">
          <div>
            <div className="text-sm text-gray-200">Not connected</div>
            <div className="text-xs text-gray-500">Placeholder for Discord OAuth connection.</div>
          </div>
          <button
            type="button"
            className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-200 hover:bg-gray-800"
          >
            Link Discord
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserConnections;
