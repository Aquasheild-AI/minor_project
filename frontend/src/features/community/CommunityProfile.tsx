import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, MapPin, Globe, Bell, LogOut, Shield, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { communityUser } from '@/data/communityData';
import { Toast } from '@/components/ui/Toast';

export function CommunityProfile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [language, setLanguage] = useState<'English' | 'Hindi'>(communityUser.language);
  const [notifPrefs, setNotifPrefs] = useState({ alerts: true, water: true, health: true, community: false });
  const [toastMsg, setToastMsg] = useState('');
  const [toastShow, setToastShow] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || communityUser.name);
  const [email, setEmail] = useState(user?.email || communityUser.email);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastShow(true);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">My Profile</h1>

      <Toast message={toastMsg} show={toastShow} onClose={() => setToastShow(false)} />

      {/* Profile Info */}
      <div className="card mb-6 p-5">
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-700">
            {(user?.name || communityUser.name).split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">{user?.name || communityUser.name}</p>
            <p className="text-sm text-slate-500">{user?.email || communityUser.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <ProfileField icon={User} label="Name" value={name} editable={editing} onChange={setName} />
          <ProfileField icon={Mail} label="Email" value={email} editable={editing} onChange={setEmail} />
          <ProfileField icon={MapPin} label="Village" value={communityUser.villageName} editable={false} />
          <ProfileField icon={MapPin} label="District" value={communityUser.district} editable={false} />
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
            <Shield className="h-4 w-4 text-slate-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Account Type</p>
              <p className="text-xs text-slate-500">Community User</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-secondary text-sm">Edit Profile</button>
          ) : (
            <>
              <button
                onClick={() => { setEditing(false); showToast('Profile updated successfully'); }}
                className="btn-primary text-sm"
              >
                <Check className="h-4 w-4" /> Save Changes
              </button>
              <button onClick={() => { setEditing(false); setName(user?.name || communityUser.name); setEmail(user?.email || communityUser.email); }} className="btn-secondary text-sm">
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="card mb-6 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary-600" />
          <h3 className="text-sm font-semibold text-slate-900">Notification Preferences</h3>
        </div>
        <div className="space-y-3">
          {([
            { key: 'alerts', label: 'Critical Risk Alerts', desc: 'Get notified when your village risk level changes' },
            { key: 'water', label: 'Water Quality Updates', desc: 'Receive updates when new water data is available' },
            { key: 'health', label: 'Health Report Updates', desc: 'Get notified when your report status changes' },
            { key: 'community', label: 'Community Updates', desc: 'General community health information' },
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
                  showToast('Notification preferences updated');
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
          <h3 className="text-sm font-semibold text-slate-900">Language</h3>
        </div>
        <div className="flex gap-3">
          {(['English', 'Hindi'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => { setLanguage(lang); showToast(`Language changed to ${lang}`); }}
              className={`flex-1 rounded-lg border p-3 text-sm font-medium transition-colors ${
                language === lang
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button onClick={handleLogout} className="btn-secondary w-full text-risk-critical hover:bg-risk-critical-bg">
        <LogOut className="h-4 w-4" /> Logout
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
          <p className="mt-0.5 text-sm font-medium text-slate-900">{value}</p>
        )}
      </div>
    </div>
  );
}
