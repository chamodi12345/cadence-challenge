import { createContext, useContext, useState, type ReactNode } from 'react';

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'COMPANY_ADMIN' | 'FINANCE' | 'AGENT';
  companyId: string;
  mustChangePassword: boolean;
}

interface AuthState {
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('cadence_user');
    return stored ? JSON.parse(stored) : null;
  });

  function login(token: string, user: AuthUser) {
    localStorage.setItem('cadence_token', token);
    localStorage.setItem('cadence_user', JSON.stringify(user));
    setUser(user);
  }

  function logout() {
    localStorage.removeItem('cadence_token');
    localStorage.removeItem('cadence_user');
    setUser(null);
  }

  function updateUser(patch: Partial<AuthUser>) {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem('cadence_user', JSON.stringify(next));
      return next;
  });
 }
 

  return <AuthContext.Provider value={{ user, login, logout, updateUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}