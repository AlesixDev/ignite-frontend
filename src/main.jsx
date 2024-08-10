import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
// eslint-disable-next-line no-unused-vars
import Pusher from 'pusher-js';
import Echo from 'laravel-echo';
import App from './App';
import 'react-toastify/dist/ReactToastify.css';
import './css/style.css';

window.Echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: import.meta.env.VITE_REVERB_PORT,
  wssPort: import.meta.env.VITE_REVERB_PORT,
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
  enabledTransports: ['ws', 'wss'],
  authEndpoint: import.meta.env.VITE_API_BASE_URL + '/broadcasting/auth',
  auth: {
    headers: {
      Authorization: 'Bearer ' + window.localStorage.getItem('token'),
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <ToastContainer position="bottom-right" theme="dark" />
    </BrowserRouter>
  </React.StrictMode>,
);
