import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth, type UserRole } from '@/hooks/useAuth';

const homeRoutes: Record<UserRole, string> = {
  admin: '/dashboard',
  worker: '/worker/dashboard',
  community: '/community/home',
};

export function ProtectedRoute({ role, children }: { role: UserRole; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== role) {
    return <Navigate to={homeRoutes[user.role]} replace />;
  }
  return <>{children}</>;
}
