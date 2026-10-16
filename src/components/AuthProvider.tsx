'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface User {
  id?: string;
  email: string;
  name: string;
  plan: string;
  role?: 'admin' | 'user';
  company?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}

interface AuthContextType {
  user: User | null;
  authenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  authenticated: false,
  isLoading: true,
  login: () => {},
  logout: async () => {},
  refresh: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Usuário atual vem do próprio servidor (sessão por cookie)
  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/config', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAuthenticated(Boolean(data?.authenticated));
        if (data?.user) {
          setUser({
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            plan: data.user.plan,
            role: data.user.role || 'user',
            company: data.user.company || null,
            phone: data.user.phone || null,
            avatar_url: data.user.avatar_url || null,
          });
        }
      }
    } catch {
      // silencioso
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = (u: User) => {
    setUser(u);
    setAuthenticated(true);
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // silencioso
    }
    setUser(null);
    setAuthenticated(false);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, authenticated, isLoading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
