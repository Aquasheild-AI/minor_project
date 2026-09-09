import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth, type UserRole } from '@/hooks/useAuth';

const homeRoutes: Record<UserRole, string> = {
  admin: '/dashboard',
  worker: '/worker/dashboard',
  community: '/community/home',
};

export function ProtectedRoute({ role, children }: { role: UserRole; children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <p className="text-sm text-slate-500">Restoring session…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  if (user.role !== role) {
    return <Navigate to={homeRoutes[user.role]} replace />;
  }
  return <>{children}</>;
}
