import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, ChevronDown } from 'lucide-react';
import { workerNotifications } from '@/data/workerData';
import { timeAgo } from '@/utils/risk';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { healthWorker } from '@/data/workerData';
import { useAuth } from '@/hooks/useAuth';

interface WorkerTopNavProps {
  title: string;
  onMenuClick: () => void;
}

export function WorkerTopNav({ title, onMenuClick }: WorkerTopNavProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = workerNotifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md lg:px-6">
      <button onClick={onMenuClick} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
        <Menu className="h-5 w-5" />
      </button>

      <h2 className="text-lg font-semibold text-slate-900 lg:text-xl">{title}</h2>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search villages, records..."
            className="w-64 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>

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
                {workerNotifications.slice(0, 5).map((n) => (
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
                        <span className="badge bg-slate-100 text-slate-600">INFO</span>
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
                onClick={() => { setNotifOpen(false); navigate('/worker/alerts'); }}
                className="block w-full border-t border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-primary-600 hover:bg-primary-50"
              >
                View All Alerts
              </button>
            </div>
          )}
        </div>

        <button onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
            {(user?.name || healthWorker.name).split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-medium text-slate-900">{user?.name || healthWorker.name}</p>
            <p className="text-xs text-slate-500">Health Worker</p>
          </div>
          <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
        </button>
      </div>
    </header>
  );
}
