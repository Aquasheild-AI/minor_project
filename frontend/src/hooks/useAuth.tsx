import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type UserRole = 'admin' | 'worker' | 'community';

interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  organization?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'aquashield_auth_token';

/** Map backend role strings to frontend role keys */
const mapRole = (backendRole: string): UserRole => {
  switch (backendRole) {
    case 'AUTHORITY':
      return 'admin';
    case 'HEALTH_WORKER':
      return 'worker';
    case 'COMMUNITY':
    default:
      return 'community';
  }
};

/** Transform the backend user payload into our frontend shape */
const transformUser = (raw: any): AuthUser => ({
  id: raw.id,
  username: raw.username,
  name: [raw.first_name, raw.last_name].filter(Boolean).join(' ') || raw.username,
  email: raw.email,
  role: mapRole(raw.role),
  phone: raw.phone ?? undefined,
  organization: raw.organization ?? undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true); // true until we try restoring session

  // ── Restore session on mount ──────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    fetch('/api/auth/me/', {
      headers: { Authorization: `Token ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Token expired');
        return res.json();
      })
      .then((data) => setUser(transformUser(data)))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  // ── Login ─────────────────────────────────────────────────────
  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch('/api/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(transformUser(data.user));
  }, []);

  // ── Register ──────────────────────────────────────────────────
  const register = useCallback(async (regData: RegisterData) => {
    const res = await fetch('/api/auth/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regData),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(transformUser(data.user));
  }, []);

  // ── Logout ────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        await fetch('/api/auth/logout/', {
          method: 'POST',
          headers: { Authorization: `Token ${token}` },
        });
      } catch {
        // ignore network errors during logout
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
