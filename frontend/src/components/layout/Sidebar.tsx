import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  HeartPulse,
  Droplets,
  Brain,
  Map,
  TrendingUp,
  Bell,
  MapPin,
  Users,
  Settings,
  LogOut,
  Activity,
  X,
} from 'lucide-react';
import { currentUser } from '@/data/mockData';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/health', label: 'Health Surveillance', icon: HeartPulse },
  { to: '/water-quality', label: 'Water Quality', icon: Droplets },
  { to: '/risk-prediction', label: 'Risk Prediction', icon: Brain },
  { to: '/risk-map', label: 'Risk Map', icon: Map },
  { to: '/trends', label: 'Historical Trends', icon: TrendingUp },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/villages', label: 'Villages', icon: MapPin },
  { to: '/admin', label: 'Administration', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">Surveillance</p>
            <p className="truncate text-xs text-slate-500">Early Warning System</p>
          </div>
          <button onClick={onClose} className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="h-4.5 w-4.5 flex-shrink-0" style={{ width: 18, height: 18 }} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
              {(user?.name || currentUser.name).split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{user?.name || currentUser.name}</p>
              <p className="truncate text-xs text-slate-500">{user?.role === 'admin' ? 'Admin' : 'Authority'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
