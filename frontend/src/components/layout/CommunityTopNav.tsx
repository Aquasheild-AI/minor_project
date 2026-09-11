import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, ChevronDown, Activity } from 'lucide-react';
import { communityNotifications } from '@/data/communityData';
import { timeAgo } from '@/utils/risk';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { communityUser } from '@/data/communityData';
import { useAuth } from '@/hooks/useAuth';

interface CommunityTopNavProps {
  title: string;
  onMenuClick: () => void;
}

export function CommunityTopNav({ title, onMenuClick }: CommunityTopNavProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = communityNotifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md lg:px-6">
      <button onClick={onMenuClick} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 lg:hidden">
          <Activity className="h-4 w-4 text-white" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 lg:text-xl">{title}</h2>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-risk-critical px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 card overflow-hidden">
              <div className="border-b border-slate-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {communityNotifications.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    className={`flex gap-3 border-b border-slate-100 px-4 py-3 hover:bg-slate-50 ${
                      !n.read ? 'bg-primary-50/40' : ''
                    }`}
                  >
                    <div className="mt-0.5">
                      {n.severity !== 'info' ? (
                        <RiskBadge level={n.severity as 'low' | 'medium' | 'high' | 'critical'} showDot={false} />
                      ) : (
                        <span className="badge bg-primary-50 text-primary-600">INFO</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-800">{n.message}</p>
                      {n.villageName && <p className="text-xs text-slate-500">{n.villageName}</p>}
                      <p className="mt-0.5 text-xs text-slate-400">{timeAgo(n.time)}</p>
                    </div>
                    {!n.read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />}
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setNotifOpen(false); navigate('/community/alerts'); }}
                className="block w-full border-t border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-primary-600 hover:bg-primary-50"
              >
                View All Alerts
              </button>
            </div>
          )}
        </div>

        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-white/10"
            aria-label="Open profile menu"
            aria-expanded={profileOpen}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
              {(user?.name || user?.username || communityUser.name).split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-slate-900">{user?.name || user?.username || communityUser.name}</p>
              <p className="text-xs text-slate-500">Community User</p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-12 w-48 card overflow-hidden py-1">
              <button
                onClick={() => { setProfileOpen(false); navigate('/community/profile'); }}
                className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                My Profile
              </button>
              <button
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
                className="block w-full border-t border-slate-100 px-4 py-2 text-left text-sm text-risk-critical hover:bg-risk-critical-bg"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
