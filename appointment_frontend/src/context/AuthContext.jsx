// Auth state — user, token, login/logout; restores session from localStorage on mount.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = localStorage.getItem('zenflow_token');
    const u = localStorage.getItem('zenflow_user');
    if (t && u) {
      try {
        setToken(t);
        setUser(JSON.parse(u));
      } catch {
        localStorage.removeItem('zenflow_token');
        localStorage.removeItem('zenflow_user');
      }
    }
  }, []);

  const login = (userData, tok) => {
    setUser(userData);
    setToken(tok);
    localStorage.setItem('zenflow_token', tok);
    localStorage.setItem('zenflow_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('zenflow_token');
    localStorage.removeItem('zenflow_user');
    navigate('/login');
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      login,
      logout
    }),
    [user, token]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
