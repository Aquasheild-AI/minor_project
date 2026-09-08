import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type UserRole = 'admin' | 'worker' | 'community';

interface AuthUser {
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'dss_auth_user';

const roleProfiles: Record<UserRole, AuthUser> = {
  admin: { name: 'Dr. Anjali Verma', email: 'anjali.verma@health.gov.in', role: 'admin' },
  worker: { name: 'Priya Yadav', email: 'priya.yadav@health.gov.in', role: 'worker' },
  community: { name: 'Abhinav Kumar', email: 'abhinav.kumar@gmail.com', role: 'community' },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const login = (role: UserRole) => {
    const u = roleProfiles[role];
    setUser(u);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
