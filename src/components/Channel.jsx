import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-toastify';
import { Gif, Gift, PlusCircle, Smiley, Sticker } from '@phosphor-icons/react';
import api from '../api';
import ChannelBar from './ChannelBar.jsx';

const ChannelMessage = ({ message, prevMessage }) => {
  const formattedDateTime = useMemo(() => {
    const date = new Date(message.created_at);

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const day = isToday ? 'Today' : isYesterday ? 'Yesterday' : date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    return `${day} at ${time}`;
  }, [message.created_at]);

  // Stack messages from the same author within 1 minute.
  const shouldStack = useMemo(() => {
    if (prevMessage) {
      const sameAuthor = prevMessage.author.id === message.author.id;
      const sentWithinMinute = (new Date(message.created_at) - new Date(prevMessage.created_at)) / 1000 < 60;

      return sameAuthor && sentWithinMinute;
    }
  }, [prevMessage, message]);

  return shouldStack ? (
    <div className="flex">
      <div className="w-14" />
      <div className="flex flex-col items-start justify-start">
        <div className="text-gray-400">{message.content}</div>
      </div>
    </div>
  ) : (
    <div className="mt-4 flex">
      {message?.author.avatar ? (
        <img
          className="h-10 rounded-full bg-transparent"
          src={message?.author.avatar}
          alt="User avatar"
        />
      ) : (
        <div className="mr-4 flex size-10 items-center justify-center rounded-full bg-gray-800 text-gray-300">
          {message?.author.username.slice(0, 1).toUpperCase()}
        </div>
      )}

      <div className="flex flex-1 flex-col items-start justify-start">
        <div className="mb-1 flex justify-start leading-none">
          <h6 className="font-semibold leading-none">
            {message?.author.username}
          </h6>
          <p className="ml-2 self-end text-xs font-medium leading-tight text-gray-600 dark:text-gray-500">
            {formattedDateTime}
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
      {messages.map((message, index) => {
        const prevMessage = messages[index - 1] || null;

        return (
          <ChannelMessage key={message.id} message={message} prevMessage={prevMessage} />
        );
      })}
    </div>
  );
};

const ChannelInput = ({ channel, fetchMessages, scrollToBottom }) => {
  const [message, setMessage] = useState('');

  const sendMessage = useCallback(async (event) => {
    event.preventDefault();

    if (!channel?.channel_id || !message) {
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
  }, [message, channel?.channel_id, fetchMessages, scrollToBottom]);

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
    if (!channel?.channel_id) {
      return;
    }

    try {
      const response = await api.get(`/channels/${channel.channel_id}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Could not fetch messages.');
    }
  }, [channel?.channel_id]);

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

  useEffect(() => {
    if (!channel) {
      return;
    }

    console.log(`Joining channel.${channel.channel_id}`);

    window.Echo.private(`channel.${channel.channel_id}`).listen('message.created', (event) => {
      console.log('Received event:', event);
    });

    return () => {
      window.Echo.leave(`channel.${channel.channel_id}`);
    };
  }, [channel, scrollToBottom]);

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
