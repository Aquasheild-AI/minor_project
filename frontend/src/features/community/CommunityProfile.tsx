import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  MapPin,
  Globe,
  Bell,
  LogOut,
  Shield,
  Check,
  Compass,
  Sparkles,
  Save,
  Users,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { communityApi } from '@/services/communityApi';
import { Toast } from '@/components/ui/Toast';
import { useCommunityTour } from '@/features/community/tour';
import { useTranslation } from 'react-i18next';

export function CommunityProfile() {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();
  const { startTour } = useCommunityTour();
  const { t, i18n } = useTranslation();

  const currentLangCode = i18n.language?.startsWith('hi') ? 'hi' : 'en';
  const [notifPrefs, setNotifPrefs] = useState({ alerts: true, water: true, health: true, community: false });
  const [toastMsg, setToastMsg] = useState('');
  const [toastShow, setToastShow] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userVillage, setUserVillage] = useState({ name: 'Assigned Village', district: 'District' });

  // Use actual user name from context or fallback to username
  const initialName = user?.name || user?.username || 'Community Citizen';
  const initialEmail = user?.email ?? '';

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);

  useEffect(() => {
    communityApi.getUserVillage().then((v) => {
      if (v) setUserVillage({ name: v.name, district: v.district });
    });
  }, []);

  // Sync state when user context loads
  useEffect(() => {
    if (user) {
      setName(user.name || user.username || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const userInitials = (initialName || 'CC')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const parts = name.trim().split(' ');
      const first_name = parts[0] || '';
      const last_name = parts.slice(1).join(' ') || '';

      await updateProfile({ first_name, last_name, email });
      setEditing(false);
      showToast(t('common.save') + '!');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setName(user?.name || user?.username || initialName);
    setEmail(user?.email || initialEmail);
  };

  const handleLanguageChange = (langCode: 'en' | 'hi') => {
    i18n.changeLanguage(langCode);
    showToast(langCode === 'hi' ? 'भाषा बदलकर हिंदी कर दी गई है' : 'Language changed to English');
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastShow(true);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('community.profile.title')}</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your citizen profile, local water notifications, and regional language.</p>
      </div>

      <Toast message={toastMsg} show={toastShow} onClose={() => setToastShow(false)} />

      {/* 1. Profile Info Card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-2xl font-bold text-white shadow-md">
                {userInitials}
              </div>
              <span
                title="Active Citizen"
                className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500"
              >
                <Check className="h-3 w-3 text-white" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-base font-bold text-slate-900">{user?.name || user?.username || 'Community Citizen'}</p>
                <span className="badge bg-blue-100 text-blue-800 border border-blue-200 font-medium inline-flex items-center gap-1">
                  <Users className="h-3 w-3 text-blue-600" />
                  {t('auth.roles.COMMUNITY')}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{initialEmail || 'No email provided'}</p>
            </div>
          </div>

          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="btn-secondary text-xs sm:text-sm shrink-0"
            >
              {t('community.profile.editProfile')}
            </button>
          )}
        </div>

        {/* Profile Form Fields */}
        <div className="mt-6 space-y-4">
          <ProfileField
            icon={User}
            label={t('community.profile.name')}
            value={name}
            editable={editing}
            onChange={setName}
            placeholder="e.g. Ramesh Kumar"
          />
          <ProfileField
            icon={Mail}
            label={t('community.profile.email')}
            value={email}
            editable={editing}
            onChange={setEmail}
            placeholder="citizen@gmail.com"
          />
          <ProfileField
            icon={MapPin}
            label={t('community.profile.village')}
            value={userVillage.name}
            editable={false}
          />
          <ProfileField
            icon={MapPin}
            label={t('community.profile.district')}
            value={userVillage.district}
            editable={false}
          />
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 shrink-0">
              <Shield className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500">{t('community.profile.accountType')}</p>
              <p className="text-sm font-bold text-slate-800">{t('auth.roles.COMMUNITY')}</p>
            </div>
          </div>
        </div>

        {editing && (
          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="btn-secondary text-sm"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-sm inline-flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? t('common.saving') : t('community.profile.saveChanges')}</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Notification Preferences Card */}
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t('community.profile.notifications')}</h3>
            <p className="text-xs text-slate-500">Configure public health alerts and water testing advisories for your village.</p>
          </div>
        </div>

        <div className="space-y-3">
          {([
            { key: 'alerts', label: t('community.profile.alertsNotif'), desc: t('community.profile.alertsNotifDesc'), badge: { text: 'URGENT', color: 'bg-red-100 text-red-700 border border-red-200' } },
            { key: 'water', label: t('community.profile.waterNotif'), desc: t('community.profile.waterNotifDesc'), badge: { text: 'WATER', color: 'bg-blue-100 text-blue-800 border border-blue-200' } },
            { key: 'health', label: t('community.profile.healthNotif'), desc: t('community.profile.healthNotifDesc'), badge: { text: 'HEALTH', color: 'bg-emerald-100 text-emerald-800 border border-emerald-200' } },
            { key: 'community', label: t('community.profile.communityNotif'), desc: t('community.profile.communityNotifDesc'), badge: { text: 'LOCAL', color: 'bg-purple-100 text-purple-800 border border-purple-200' } },
          ] as const).map((item) => (
            <ToggleRow
              key={item.key}
              label={item.label}
              description={item.desc}
              badge={item.badge}
              checked={notifPrefs[item.key]}
              onChange={(checked) => {
                setNotifPrefs({ ...notifPrefs, [item.key]: checked });
                showToast(t('common.updated'));
              }}
            />
          ))}
        </div>
      </div>

      {/* 3. Language Selection Card */}
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t('community.profile.languageSection')}</h3>
            <p className="text-xs text-slate-500">Choose your preferred portal display language.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <button
            type="button"
            onClick={() => handleLanguageChange('en')}
            className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all ${
              currentLangCode === 'en'
                ? 'border-primary-600 bg-primary-50 text-primary-800 ring-2 ring-primary-500/20 font-bold shadow-xs'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium'
            }`}
          >
            <Globe className="h-5 w-5 mb-1.5 text-primary-600" />
            <span className="text-sm">English</span>
            <span className="text-xs text-slate-400 mt-0.5">Primary language</span>
          </button>

          <button
            type="button"
            onClick={() => handleLanguageChange('hi')}
            className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all ${
              currentLangCode === 'hi'
                ? 'border-primary-600 bg-primary-50 text-primary-800 ring-2 ring-primary-500/20 font-bold shadow-xs'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium'
            }`}
          >
            <Globe className="h-5 w-5 mb-1.5 text-teal-600" />
            <span className="text-sm">हिंदी (Hindi)</span>
            <span className="text-xs text-slate-400 mt-0.5">प्राथमिक भाषा</span>
          </button>
        </div>
      </div>

      {/* 4. Interactive Guided Tour Card */}
      <div className="card p-6 border-primary-200 bg-gradient-to-br from-primary-50/50 to-blue-50/30" data-tour="profile-tour-card">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary-600" />
            <h3 className="text-sm font-bold text-slate-900">{t('community.profile.tourSectionTitle')}</h3>
          </div>
          <span className="badge bg-primary-100 text-primary-800 text-[11px] font-semibold">{t('tour.welcomeModal.badge')}</span>
        </div>
        <p className="mb-4 text-xs text-slate-600 leading-relaxed">
          {t('community.profile.tourSectionDesc')}
        </p>
        <button
          type="button"
          onClick={startTour}
          className="btn-primary text-xs inline-flex items-center gap-2"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>{t('community.profile.replayButton')}</span>
        </button>
      </div>

      {/* 5. Logout */}
      <button
        type="button"
        onClick={handleLogout}
        className="card p-3.5 w-full flex items-center justify-center gap-2 text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 border-slate-200 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        <span>{t('common.buttons.logout')}</span>
      </button>
    </div>
  );
}

function ProfileField({
  icon: Icon,
  label,
  value,
  editable,
  onChange,
  placeholder,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  editable: boolean;
  onChange?: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
        <span>{label}</span>
      </label>
      {editable && onChange ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input"
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800">
          {value || 'Not provided'}
        </div>
      )}
    </div>
  );
}

/**
 * Contained Toggle Switch component ensuring the knob never spills out of the capsule.
 */
function ToggleRow({
  label,
  description,
  checked,
  onChange,
  badge,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  badge?: { text: string; color: string };
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-xs cursor-pointer select-none"
    >
      <div className="pr-4 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          {badge && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${badge.color}`}>
              {badge.text}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{description}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={(e) => {
          e.stopPropagation();
          onChange(!checked);
        }}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
          checked ? 'bg-primary-600' : 'bg-slate-300'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
