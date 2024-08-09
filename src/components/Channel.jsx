import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Gif, Gift, PlusCircle, Smiley, Sticker } from '@phosphor-icons/react';
import api from '../api';
import ChannelBar from './ChannelBar.jsx';

const dateFormatter = new Intl.DateTimeFormat('en', {
  timeStyle: 'medium',
  dateStyle: 'short',
});

const ChannelMessage = ({ message }) => {
  const date = new Date(message.created_at);
  const formattedDate = dateFormatter.format(date).replace(',', '');

  return (
    <div className="mt-4 flex">
      {message?.author.avatar ? (
        <img
          className="mx-4 h-10 rounded-full bg-transparent"
          src={message?.author.avatar}
          alt="User avatar"
        />
      ) : (
        <div className="mx-4 flex size-10 items-center justify-center rounded-full bg-gray-800 text-gray-300">
          {message?.author.nickname.slice(0, 1).toUpperCase()}
        </div>
      )}

      <div className="flex flex-col items-start justify-start">
        <div className="mb-1 flex justify-start leading-none">
          <h6 className="font-medium leading-none">
            {message?.author.nickname}
          </h6>
          <p className="ml-2 self-end text-xs font-medium leading-tight text-gray-600 dark:text-gray-500">
            {formattedDate}
          </p>
        </div>

        <div className="text-gray-400">{message.content}</div>
      </div>
    </div>
  );
};

const ChannelMessages = ({ messages }) => {
  return (
    <div className="h-full">
      {messages.map((message) => (
        <ChannelMessage key={message.id} message={message} />
      ))}
    </div>
  );
};

const ChannelInput = ({ channel, fetchMessages }) => {
  const [message, setMessage] = useState('');

  const sendMessage = useCallback(async (event) => {
    event.preventDefault();

    if (!message) {
      return;
    }

    try {
      await api.post(`/channels/${channel.channel_id}/messages`, { content: message });
      setMessage('');
      fetchMessages();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Could not send message.');
    }
  }, [channel, message, fetchMessages]);

  return (
    <div className="mx-4 my-6 flex items-center rounded-lg bg-gray-300 py-2 dark:bg-gray-600">
      <div>
        <PlusCircle
          className="mx-4 cursor-pointer text-gray-400 hover:text-gray-200"
          weight="fill"
          size={26}
        />
      </div>

      <form onSubmit={(e) => sendMessage(e)} className="w-full">
        <input
          className="w-full border-0 bg-inherit p-0 text-white outline-none placeholder:text-gray-400 focus:ring-0"
          type="text"
          placeholder={`Message #${channel?.name}`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </form>

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
  const [messages, setMessages] = useState([]);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await api.get(`/channels/${channel.channel_id}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Could not fetch messages.');
    }
  }, [channel]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return (
    <div className="relative flex w-full flex-col dark:bg-gray-700">
      <ChannelBar channel={channel} />
      <hr className="m-0 w-full border border-gray-800 bg-gray-800 p-0" />
      <ChannelMessages messages={messages} />
      <ChannelInput channel={channel} fetchMessages={fetchMessages} />
    </div>
  );
};

export default Channel;
