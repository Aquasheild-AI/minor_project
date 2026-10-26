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
  Compass,
} from 'lucide-react';
import { communityUser } from '@/data/communityData';
import { useAuth } from '@/hooks/useAuth';
import { useCommunityTour } from '@/features/community/tour';
import { useTranslation } from 'react-i18next';

const navKeyMap = [
  { to: '/community/home', key: 'home', icon: Home },
  { to: '/community/village', key: 'myVillage', icon: MapPin },
  { to: '/community/risk', key: 'riskStatus', icon: ShieldAlert },
  { to: '/community/water-quality', key: 'waterQuality', icon: Droplets },
  { to: '/community/report', key: 'reportIssue', icon: HeartPulse },
  { to: '/community/reports', key: 'myReports', icon: FileText },
  { to: '/community/chat', key: 'aiChatbot', icon: MessageSquare },
  { to: '/community/risk-map', key: 'riskMap', icon: MapPin },
  { to: '/community/trends', key: 'trends', icon: TrendingUp },
  { to: '/community/alerts', key: 'alerts', icon: Bell },
] as const;

interface CommunitySidebarProps {
  open: boolean;
  onClose: () => void;
}

export function CommunitySidebar({ open, onClose }: CommunitySidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { startTour } = useCommunityTour();
  const { t } = useTranslation();

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
            <p className="truncate text-sm font-bold text-slate-900">{t('nav.portalTitles.communityHome')}</p>
            <p className="truncate text-xs text-slate-500">{t('common.appName')}</p>
          </div>
          <button onClick={onClose} className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" data-tour="navigation-menu">
          {navKeyMap.map((item) => {
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
                {t(`nav.${item.key}`)}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <button
            onClick={() => {
              onClose();
              startTour();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 transition-colors mb-1"
          >
            <Compass className="h-4 w-4 text-primary-600" />
            {t('common.buttons.tourGuide')}
          </button>

          <NavLink
            to="/community/profile"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <User className="h-4 w-4" />
            {t('nav.profile')}
          </NavLink>
          <div className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
              {(user?.name || communityUser.name).split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{user?.name || communityUser.name}</p>
              <p className="truncate text-xs text-slate-500">{t('auth.roles.COMMUNITY')}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title={t('common.buttons.logout')}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
