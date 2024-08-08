import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import App from './App';
import 'react-toastify/dist/ReactToastify.css';
import './css/style.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <ToastContainer position="bottom-right" theme="dark" />
    </BrowserRouter>
  </React.StrictMode>,
);
