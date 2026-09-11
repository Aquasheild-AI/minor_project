import { useState } from 'react';
import { User, Lock, Bell, Sliders, Check } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/hooks/useAuth';

const sections = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'password', label: 'Password', icon: Lock },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'system', label: 'System Preferences', icon: Sliders },
];

export function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const [active, setActive] = useState('profile');
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({ critical: true, high: true, medium: false, email: true, sms: false });
  const [systemPrefs, setSystemPrefs] = useState({ autoRefresh: true, riskThreshold: '60', timezone: 'IST (UTC+5:30)' });

  const initialName = user?.name || user?.username || '';
  const initialEmail = user?.email ?? '';
  const initialPhone = user?.phone ?? '';
  
  const [form, setForm] = useState({ name: initialName, email: initialEmail, phone: initialPhone });

  const handleSave = async () => {
    setErrorMsg('');
    if (active === 'profile') {
      setSaving(true);
      try {
        const parts = form.name.trim().split(' ');
        const first_name = parts[0] || '';
        const last_name = parts.slice(1).join(' ') || '';
        
        await updateProfile({ first_name, last_name, email: form.email, phone: form.phone });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        setEditing(false);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to save settings.');
      } finally {
        setSaving(false);
      }
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account and system preferences." breadcrumb={['Home', 'Settings']} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sidebar nav */}
        <div className="card p-3 lg:col-span-1">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active === s.key ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="card p-6 lg:col-span-3">
          {saved && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-risk-low-bg px-3 py-2 text-sm text-risk-low">
              <Check className="h-4 w-4" /> Settings saved successfully.
            </div>
          )}
          {errorMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
              {errorMsg}
            </div>
          )}

          {active === 'profile' && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Profile Information</h3>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-700">
                  {initialName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{initialName || 'Admin User'}</p>
                  <p className="text-sm text-slate-500">{initialEmail || 'No email provided'}</p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Full Name</label>
                  {editing ? (
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
                  ) : (
                    <div className="input bg-slate-50 flex items-center text-slate-700">{form.name}</div>
                  )}
                </div>
                <div>
                  <label className="label">Email</label>
                  {editing ? (
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
                  ) : (
                    <div className="input bg-slate-50 flex items-center text-slate-700">{form.email}</div>
                  )}
                </div>
                <div>
                  <label className="label">Role</label>
                  <div className="input bg-slate-50 flex items-center text-slate-700">{user?.role === 'admin' ? 'Administrator' : user?.role || 'Admin'}</div>
                </div>
                <div>
                  <label className="label">Phone</label>
                  {editing ? (
                    <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98XXXXXXXX" className="input" />
                  ) : (
                    <div className="input bg-slate-50 flex items-center text-slate-700">{form.phone || '-'}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {active === 'password' && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Change Password</h3>
              <div className="mt-4 space-y-4 max-w-md">
                <div><label className="label">Current Password</label><input type="password" className="input" /></div>
                <div><label className="label">New Password</label><input type="password" className="input" /></div>
                <div><label className="label">Confirm New Password</label><input type="password" className="input" /></div>
              </div>
            </div>
          )}

          {active === 'notifications' && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Notification Preferences</h3>
              <div className="mt-4 space-y-3">
                <Toggle label="Critical alerts" description="Receive notifications for critical risk alerts" checked={notifPrefs.critical} onChange={(v) => setNotifPrefs({ ...notifPrefs, critical: v })} />
                <Toggle label="High alerts" description="Receive notifications for high risk alerts" checked={notifPrefs.high} onChange={(v) => setNotifPrefs({ ...notifPrefs, high: v })} />
                <Toggle label="Medium alerts" description="Receive notifications for medium risk alerts" checked={notifPrefs.medium} onChange={(v) => setNotifPrefs({ ...notifPrefs, medium: v })} />
                <Toggle label="Email notifications" description="Send alert summaries via email" checked={notifPrefs.email} onChange={(v) => setNotifPrefs({ ...notifPrefs, email: v })} />
                <Toggle label="SMS notifications" description="Send critical alerts via SMS" checked={notifPrefs.sms} onChange={(v) => setNotifPrefs({ ...notifPrefs, sms: v })} />
              </div>
            </div>
          )}

          {active === 'system' && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900">System Preferences</h3>
              <div className="mt-4 space-y-4">
                <Toggle label="Auto-refresh dashboard" description="Automatically refresh dashboard data every 5 minutes" checked={systemPrefs.autoRefresh} onChange={(v) => setSystemPrefs({ ...systemPrefs, autoRefresh: v })} />
                <div>
                  <label className="label">Risk Alert Threshold</label>
                  <select value={systemPrefs.riskThreshold} onChange={(e) => setSystemPrefs({ ...systemPrefs, riskThreshold: e.target.value })} className="input max-w-xs">
                    <option value="35">Medium (35%+)</option>
                    <option value="60">High (60%+)</option>
                    <option value="80">Critical (80%+)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Timezone</label>
                  <input type="text" value={systemPrefs.timezone} onChange={(e) => setSystemPrefs({ ...systemPrefs, timezone: e.target.value })} className="input max-w-xs" />
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            {active === 'profile' && !editing ? (
              <button onClick={() => setEditing(true)} className="btn-secondary">Edit Profile</button>
            ) : (
              <>
                {active === 'profile' && (
                  <button onClick={() => { setEditing(false); setForm({ name: initialName, email: initialEmail, phone: initialPhone }); }} disabled={saving} className="btn-secondary">
                    Cancel
                  </button>
                )}
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}
