import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, MapPin, Globe, Bell, LogOut, Shield, Check, Compass, Sparkles } from 'lucide-react';
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

  const handleLanguageChange = (langCode: 'en' | 'hi') => {
    i18n.changeLanguage(langCode);
    showToast(langCode === 'hi' ? 'भाषा बदलकर हिंदी कर दी गई है' : 'Language changed to English');
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastShow(true);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{t('community.profile.title')}</h1>

      <Toast message={toastMsg} show={toastShow} onClose={() => setToastShow(false)} />

      {/* Profile Info */}
      <div className="card mb-6 p-5">
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-700">
            {initialName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">{user?.name || user?.username || 'Community Citizen'}</p>
            <p className="text-sm text-slate-500">{initialEmail || 'No email provided'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <ProfileField icon={User} label={t('community.profile.name')} value={name} editable={editing} onChange={setName} />
          <ProfileField icon={Mail} label={t('community.profile.email')} value={email} editable={editing} onChange={setEmail} />
          <ProfileField icon={MapPin} label={t('community.profile.village')} value={userVillage.name} editable={false} />
          <ProfileField icon={MapPin} label={t('community.profile.district')} value={userVillage.district} editable={false} />
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
            <Shield className="h-4 w-4 text-slate-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">{t('community.profile.accountType')}</p>
              <p className="text-xs text-slate-500">{t('auth.roles.COMMUNITY')}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-secondary text-sm">
              {t('community.profile.editProfile')}
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary text-sm"
              >
                <Check className="h-4 w-4" /> {saving ? t('common.saving') : t('community.profile.saveChanges')}
              </button>
              <button onClick={() => { setEditing(false); setName(initialName); setEmail(initialEmail); }} disabled={saving} className="btn-secondary text-sm">
                {t('common.cancel')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="card mb-6 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary-600" />
          <h3 className="text-sm font-semibold text-slate-900">{t('community.profile.notifications')}</h3>
        </div>
        <div className="space-y-3">
          {([
            { key: 'alerts', label: t('community.profile.alertsNotif'), desc: t('community.profile.alertsNotifDesc') },
            { key: 'water', label: t('community.profile.waterNotif'), desc: t('community.profile.waterNotifDesc') },
            { key: 'health', label: t('community.profile.healthNotif'), desc: t('community.profile.healthNotifDesc') },
            { key: 'community', label: t('community.profile.communityNotif'), desc: t('community.profile.communityNotifDesc') },
          ] as const).map((item) => (
            <label key={item.key} className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-100 p-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={notifPrefs[item.key]}
                onChange={(e) => {
                  setNotifPrefs({ ...notifPrefs, [item.key]: e.target.checked });
                  showToast(t('common.updated'));
                }}
                className="h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="card mb-6 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary-600" />
          <h3 className="text-sm font-semibold text-slate-900">{t('community.profile.languageSection')}</h3>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleLanguageChange('en')}
            className={`flex-1 rounded-lg border p-3 text-sm font-medium transition-colors ${
              currentLangCode === 'en'
                ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            English
          </button>
          <button
            onClick={() => handleLanguageChange('hi')}
            className={`flex-1 rounded-lg border p-3 text-sm font-medium transition-colors ${
              currentLangCode === 'hi'
                ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            हिंदी (Hindi)
          </button>
        </div>
      </div>

      {/* Interactive Guided Tour Card */}
      <div className="card mb-6 p-5" data-tour="profile-tour-card">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-slate-900">{t('community.profile.tourSectionTitle')}</h3>
          </div>
          <span className="badge bg-primary-50 text-primary-700 text-[11px] font-semibold">{t('tour.welcomeModal.badge')}</span>
        </div>
        <p className="mb-4 text-xs text-slate-500 leading-relaxed">
          {t('community.profile.tourSectionDesc')}
        </p>
        <button
          onClick={startTour}
          className="btn-secondary text-xs flex items-center gap-2 border-primary-200 text-primary-700 hover:bg-primary-50 font-semibold py-2"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary-600" />
          {t('community.profile.replayButton')}
        </button>
      </div>

      {/* Logout */}
      <button onClick={handleLogout} className="btn-secondary w-full text-risk-critical hover:bg-risk-critical-bg">
        <LogOut className="h-4 w-4" /> {t('common.buttons.logout')}
      </button>
    </div>
  );
}

function ProfileField({ icon: Icon, label, value, editable, onChange }: { icon: React.ElementType; label: string; value: string; editable: boolean; onChange?: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
      <Icon className="h-4 w-4 text-slate-400" />
      <div className="flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        {editable && onChange ? (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        ) : (
          <p className="mt-0.5 text-sm font-medium text-slate-900">{value || 'Not provided'}</p>
        )}
      </div>
    </div>
  );
}
