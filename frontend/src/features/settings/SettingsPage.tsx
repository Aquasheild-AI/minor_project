import { useState } from 'react';
import { User, Lock, Bell, Sliders, Check } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { currentUser } from '@/data/mockData';

const sections = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'password', label: 'Password', icon: Lock },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'system', label: 'System Preferences', icon: Sliders },
];

export function SettingsPage() {
  const [active, setActive] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({ critical: true, high: true, medium: false, email: true, sms: false });
  const [systemPrefs, setSystemPrefs] = useState({ autoRefresh: true, riskThreshold: '60', timezone: 'IST (UTC+5:30)' });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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

          {active === 'profile' && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Profile Information</h3>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-700">
                  {currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{currentUser.name}</p>
                  <p className="text-sm text-slate-500">{currentUser.email}</p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><label className="label">Full Name</label><input type="text" defaultValue={currentUser.name} className="input" /></div>
                <div><label className="label">Email</label><input type="email" defaultValue={currentUser.email} className="input" /></div>
                <div><label className="label">Role</label><input type="text" defaultValue={currentUser.role} disabled className="input bg-slate-50" /></div>
                <div><label className="label">Phone</label><input type="text" placeholder="+91 98XXXXXXXX" className="input" /></div>
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

          <div className="mt-6 flex justify-end">
            <button onClick={handleSave} className="btn-primary">Save Changes</button>
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
