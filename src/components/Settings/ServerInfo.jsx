const ServerInfo = ({ guild }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Server Info</h3>
        <p className="mt-1 text-sm text-gray-400">
          Basic details and placeholders for the server configuration.
        </p>
      </div>
      <div className="grid gap-4 rounded-lg border border-gray-800 bg-gray-950/40 p-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Server Name</div>
          <div className="mt-1 text-sm text-gray-200">{guild?.name || 'Unnamed Server'}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Description</div>
          <div className="mt-1 text-sm text-gray-300">
            Placeholder text for a future server description field.
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Icon</div>
          <div className="mt-1 text-sm text-gray-300">Placeholder for server icon upload.</div>
        </div>
      </div>
    </div>
  );
};

export default ServerInfo;
