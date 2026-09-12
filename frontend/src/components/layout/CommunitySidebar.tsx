import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  MapPin,
  ShieldAlert,
  Droplets,
  HeartPulse,
  Bell,
  TrendingUp,
  User,
  LogOut,
  Activity,
  X,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { communityUser } from '@/data/communityData';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { to: '/community/home', label: 'Home', icon: Home },
  { to: '/community/village', label: 'My Village', icon: MapPin },
  { to: '/community/risk', label: 'Risk Status', icon: ShieldAlert },
  { to: '/community/water-quality', label: 'Water Quality', icon: Droplets },
  { to: '/community/report', label: 'Report Issue', icon: HeartPulse },
  { to: '/community/reports', label: 'My Reports', icon: FileText },
  { to: '/community/chat', label: 'AI Health Assistant', icon: MessageSquare },
  { to: '/community/risk-map', label: 'Risk Map', icon: MapPin },
  { to: '/community/trends', label: 'Trends', icon: TrendingUp },
  { to: '/community/alerts', label: 'Alerts', icon: Bell },
];

interface CommunitySidebarProps {
  open: boolean;
  onClose: () => void;
}

export function CommunitySidebar({ open, onClose }: CommunitySidebarProps) {
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
            <p className="truncate text-sm font-bold text-slate-900">Community Health</p>
            <p className="truncate text-xs text-slate-500">Monitor & Report</p>
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
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <NavLink
            to="/community/profile"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <User className="h-4 w-4" />
            Profile
          </NavLink>
          <div className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
              {(user?.name || communityUser.name).split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{user?.name || communityUser.name}</p>
              <p className="truncate text-xs text-slate-500">Community User</p>
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
