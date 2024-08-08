import { useState, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import useStore from './hooks/useStore';
import api from './api';
import PageTitle from './components/PageTitle';
import LoginPage from './pages/Login/Login';
import RegisterPage from './pages/Register/Register';
import DashboardPage from './pages/Dashboard/Dashboard';

const AuthRoute = ({ children }) => {
  const store = useStore();

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        const localToken = localStorage.getItem('token');
        if (localToken) {
          const { data: user } = await api.get('user', {
            headers: { Authorization: `Bearer ${localToken}` }
          });

          if (user?.username) {
            store.login(user, localToken);
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
  }, [store, initialized]);

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-body-bg">
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
    return <Navigate to="/dashboard" replace />;
  }

  return children ? children : <Outlet />;
};

function App() {
  const store = useStore();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return <Routes>
    <Route
      index
      element={
        store.user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
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
        path="/dashboard"
        element={
          <>
            <PageTitle title="Dashboard" />
            <DashboardPage />
          </>
        }
      />
    </Route>
  </Routes>;
}

export default App;
