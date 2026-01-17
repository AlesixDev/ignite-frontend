const Avatar = ({ user, className = 'h-10' }) => {
  return (
    <>
      {user.avatar ? (
        <img
          className={`cursor-pointer rounded-full bg-transparent ${className}`}
          src={user.avatar}
          alt={`${user.name} avatar`}
        />
      ) : (
        <div
          className={`flex cursor-pointer items-center justify-center rounded-full bg-gray-800 text-gray-300 ${className}`}
        >
          {user?.name?.slice(0, 1).toUpperCase()}
        </div>
      )}
    </>
  );
};

export default Avatar;
