const UserInfo = ({ user }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">User Info</h3>
        <p className="mt-1 text-sm text-gray-400">Basic profile details and placeholders.</p>
      </div>
      <div className="grid gap-4 rounded-lg border border-gray-800 bg-gray-950/40 p-4 sm:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Username</div>
          <div className="mt-1 text-sm text-gray-200 break-words">{user?.username || 'Unknown'}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Status</div>
          <div className="mt-1 text-sm text-gray-300 break-words">{user?.status || 'Online'}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Email</div>
          <div className="mt-1 text-sm text-gray-300 break-words">Placeholder for account email.</div>
        </div>
      </div>
    </div>
  );
};

export default UserInfo;
