import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import Pusher from 'pusher-js';
import Echo from 'laravel-echo';
import App from './App';
import api from './api';
import './css/style.css';
import { Toaster } from './components/ui/sonner';

import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

function RouteLogger() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    console.group('🧭 Router navigation');
    console.log('Type:', navigationType); // PUSH | POP | REPLACE
    console.log('Path:', location.pathname);
    console.log('Search:', location.search);
    console.log('State:', location.state);
    console.groupEnd();
  }, [location, navigationType]);

  return null;
}


window.Echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: import.meta.env.VITE_REVERB_PORT,
  wssPort: import.meta.env.VITE_REVERB_PORT,
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
  enabledTransports: ['ws', 'wss'],
  authorizer: (channel) => {
    return {
      authorize: (socketId, callback) => {
        api.post('broadcasting/auth', {
          socket_id: socketId,
          channel_name: channel.name
        })
        .then(response => {
          callback(false, response.data);
        })
        .catch(error => {
          callback(true, error);
        });
      }
    };
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster />
      <RouteLogger />
    </BrowserRouter>
  </React.StrictMode>,
);
