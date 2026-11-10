import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { TOKEN_KEY } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  // Restaura la sesión activa al cargar la app (GET /auth/me)
  useEffect(() => {
    const restaurar = async () => {
      if (!localStorage.getItem(TOKEN_KEY)) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    restaurar();
  }, []);

  // Cierra la sesión cuando el interceptor detecta un token expirado
  useEffect(() => {
    window.addEventListener('auth:expired', logout);
    return () => window.removeEventListener('auth:expired', logout);
  }, [logout]);

  const login = useCallback(async (correo, password) => {
    const { data } = await api.post('/auth/login', { correo, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (datos) => {
    const { data } = await api.post('/auth/register', datos);
    return data;
  }, []);

  const verifyOtp = useCallback(async (correo, codigo) => {
    const { data } = await api.post('/auth/verify-otp', { correo, codigo });
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const resendOtp = useCallback(async (correo) => {
    const { data } = await api.post('/auth/resend-otp', { correo });
    return data;
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
    return data.user;
  }, []);

  const hasRole = useCallback((...roles) => !!user && roles.includes(user.rol), [user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      verifyOtp,
      resendOtp,
      logout,
      refreshUser,
      hasRole,
    }),
    [user, loading, login, register, verifyOtp, resendOtp, logout, refreshUser, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un <AuthProvider>');
  }
  return context;
}
