import { useState, useCallback, useEffect, useRef } from 'react';
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
          className="h-10 rounded-full bg-transparent"
          src={message?.author.avatar}
          alt="User avatar"
        />
      ) : (
        <div className="mr-4 flex size-10 items-center justify-center rounded-full bg-gray-800 text-gray-300">
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

const ChannelMessages = ({ messages, messagesRef }) => {
  return (
    <div className="h-full max-h-[calc(100vh-9rem)] overflow-y-auto px-4" ref={messagesRef}>
      {messages.map((message) => (
        <ChannelMessage key={message.id} message={message} />
      ))}
    </div>
  );
};

const ChannelInput = ({ channel, fetchMessages, scrollToBottom }) => {
  const [message, setMessage] = useState('');

  const sendMessage = useCallback(async (event) => {
    event.preventDefault();

    if (!message) {
      return;
    }

    try {
      await api.post(`/channels/${channel.channel_id}/messages`, { content: message });
      setMessage('');
      fetchMessages().then(() => {
        scrollToBottom();
      });
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Could not send message.');
    }
  }, [message, channel.channel_id, fetchMessages, scrollToBottom]);

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
  const [firstLoad, setFirstLoad] = useState(true);

  const messagesRef = useRef();

  const scrollToBottom = useCallback(() => {
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messagesRef]);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await api.get(`/channels/${channel.channel_id}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Could not fetch messages.');
    }
  }, [channel.channel_id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages, firstLoad, scrollToBottom]);

  useEffect(() => {
    if (messages && messages.length && firstLoad) {
      scrollToBottom();
      setFirstLoad(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    setFirstLoad(true);
  }, [channel]);

  return (
    <div className="relative flex w-full flex-col dark:bg-gray-700">
      <ChannelBar channel={channel} />
      <hr className="m-0 w-full border border-gray-800 bg-gray-800 p-0" />
      <ChannelMessages messages={messages} messagesRef={messagesRef} />
      <ChannelInput channel={channel} fetchMessages={fetchMessages} scrollToBottom={scrollToBottom} />
    </div>
  );
};

export default Channel;
