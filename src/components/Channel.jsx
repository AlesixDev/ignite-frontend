import { Gif, Gift, PlusCircle, Smiley, Sticker } from '@phosphor-icons/react';
import ChannelBar from './ChannelBar.jsx';

const dateFormatter = new Intl.DateTimeFormat('en', {
  timeStyle: 'medium',
  dateStyle: 'short',
});

const Post = ({ post }) => {
  const date = new Date(post.date);
  const formattedDate = dateFormatter.format(date).replace(",", "");

  return (
    <div className="mt-4 flex">
      <img
        className="mx-4 h-10 rounded-full bg-transparent"
        src={post.avatar}
        alt="User avatar"
      />

      <div className="flex flex-col items-start justify-start">
        <div className="mb-1 flex justify-start leading-none">
          <h6 className={`font-medium leading-none ${post.usernameColour}`}>
            {post.username}
          </h6>
          <p className="ml-2 self-end text-xs font-medium leading-tight text-gray-600 dark:text-gray-500">
            {formattedDate}
          </p>
        </div>

        <div className=":text-gray-400">{post.message}</div>
      </div>
    </div>
  );
};

const Posts = () => {
  const userPosts = [].map((post) => <Post post={post} key={post.id} />);

  return <div className="h-full">{userPosts}</div>;
};

const MessageInput = ({ channel }) => {
  return (
    <div className="mx-4 my-6 flex items-center rounded-lg bg-gray-300 py-2 dark:bg-gray-600">
      <div>
        <PlusCircle
          className="mx-4 cursor-pointer text-gray-400 hover:text-gray-200"
          weight="fill"
          size={26}
        />
      </div>

      <input
        className="w-full border-0 bg-inherit p-0 text-white outline-none placeholder:text-gray-400 focus:ring-0"
        type="text"
        placeholder={`Message #${channel?.name}`}
      />

      <div className="mr-1 flex">
        <Gift
          className="mx-1.5 cursor-pointer text-gray-400 hover:text-gray-200"
          weight="fill"
          size={28}
        />
        <Gif
          className="mx-1.5 cursor-pointer text-gray-400 hover:text-gray-200"
          weight="fill"
          size={28}
        />
        <Sticker
          className="mx-1.5 cursor-pointer text-gray-400 hover:text-gray-200"
          weight="fill"
          size={28}
        />
        <Smiley
          className="mx-1.5 cursor-pointer text-gray-400 hover:text-gray-200"
          weight="fill"
          size={28}
        />
      </div>
    </div>
  );
};

const Channel = ({ channel }) => {
  return (
    <div className="relative flex w-full flex-col dark:bg-gray-700">
      <ChannelBar channel={channel} />
      <hr className="m-0 w-full border border-gray-800 bg-gray-800 p-0" />
      <Posts />
      <MessageInput channel={channel} />
    </div>
  );
};

export default Channel;
