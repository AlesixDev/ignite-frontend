import { useState, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import useStore from './hooks/useStore';
import api from './api';
import PageTitle from './components/PageTitle';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import DirectMessagesPage from './pages/DirectMessages';
import GuildChannelPage from './pages/GuildChannel';
import { GuildsService } from './services/guilds.service';
import { FriendsService } from './services/friends.service';

const AuthRoute = ({ children }) => {
  const store = useStore();

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        const localToken = localStorage.getItem('token');
        if (localToken) {
          const { data: user } = await api.get('@me', {
            headers: { Authorization: `Bearer ${localToken}` }
          });

          if (user?.username) {
            store.login(user, localToken);

            await GuildsService.loadGuilds();
            await FriendsService.loadFriends();
            await FriendsService.loadRequests();
          } else {
            localStorage.removeItem('token');
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setInitialized(true);
      }
    };

    if (!initialized) {
      initialize();
    }
  }, [initialized]);

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-body">
        <div className="size-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!store.user) {
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
};

const GuestRoute = ({ children }) => {
  if (localStorage.getItem('token')) {
    return <Navigate to="/channels/@me" replace />;
  }

  return children ? children : <Outlet />;
};

function App() {
  const store = useStore();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    // eslint-disable-next-line no-undef
    if (process.env.NODE_ENV === 'development') return;
    
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return <Routes>
    <Route
      index
      element={
        store.user ? <Navigate to="/channels/@me" replace /> : <Navigate to="/login" replace />
      }
    />
    <Route element={<GuestRoute/>}>
      <Route
        path="login"
        element={
          <>
            <PageTitle title="Login" />
            <LoginPage />
          </>
        }
      />
      <Route
        path="register"
        element={
          <>
            <PageTitle title="Register" />
            <RegisterPage />
          </>
        }
      />
    </Route>
    <Route element={<AuthRoute />}>
      <Route
        path="/channels/@me"
        element={
          <>
            <PageTitle title="Direct Messages" />
            <DirectMessagesPage />
          </>
        }
      />
      <Route
        path="/channels/:guildId/:channelId?"
        element={
          <>
            <PageTitle title="Guild Channel" />
            <GuildChannelPage />
          </>
        }
      />
    </Route>
  </Routes>;
}

export default App;
