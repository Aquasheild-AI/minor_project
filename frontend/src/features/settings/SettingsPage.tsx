import { useState, useEffect } from 'react';
import {
  User,
  Lock,
  Bell,
  Sliders,
  Check,
  ShieldCheck,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Sparkles,
  AlertTriangle,
  Clock,
  RefreshCw,
  Smartphone,
  Save,
  X,
  Info,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';

const PREFS_KEY = 'aquashield_settings_prefs';

const sections = [
  { key: 'profile', label: 'Profile', icon: User, desc: 'Manage your administrator details and account identity' },
  { key: 'password', label: 'Password', icon: Lock, desc: 'Update your security credentials and access keys' },
  { key: 'notifications', label: 'Notifications', icon: Bell, desc: 'Configure risk threshold alerts and delivery channels' },
  { key: 'system', label: 'System Preferences', icon: Sliders, desc: 'Platform behavior, auto-refresh, and regional settings' },
];

export function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const [active, setActive] = useState('profile');
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Load saved preferences from localStorage
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.notif) return parsed.notif;
      }
    } catch {}
    return { critical: true, high: true, medium: false, email: true, sms: false };
  });

  const [systemPrefs, setSystemPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.system) return parsed.system;
      }
    } catch {}
    return { autoRefresh: true, riskThreshold: '60', timezone: 'IST (UTC+5:30)' };
  });

  const [form, setForm] = useState({
    name: user?.name || user?.username || '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  });

  // Keep form in sync when auth user loads / updates
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || user.username || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const initialName = user?.name || user?.username || 'Admin User';
  const initialEmail = user?.email || 'No email registered';
  const initialPhone = user?.phone || '';
  const userInitials = (initialName || 'AD')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSave = async () => {
    setErrorMsg('');
    setSaving(true);

    try {
      if (active === 'profile') {
        const parts = form.name.trim().split(' ');
        const first_name = parts[0] || '';
        const last_name = parts.slice(1).join(' ') || '';

        await updateProfile({ first_name, last_name, email: form.email, phone: form.phone });
        setEditing(false);
      } else if (active === 'password') {
        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
          throw new Error('Please enter your current password and a new password with confirmation.');
        }
        if (passwordForm.newPassword.length < 8) {
          throw new Error('New password must be at least 8 characters long.');
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
          throw new Error('New password and confirmation do not match.');
        }

        await api.changePassword(
          passwordForm.currentPassword,
          passwordForm.newPassword,
          passwordForm.confirmPassword
        );
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        // Save preferences to localStorage
        localStorage.setItem(
          PREFS_KEY,
          JSON.stringify({ notif: notifPrefs, system: systemPrefs })
        );
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelProfile = () => {
    setEditing(false);
    setForm({
      name: user?.name || user?.username || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    setErrorMsg('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Profile"
        subtitle="Manage your administrative credentials, notification channels, and platform preferences."
        breadcrumb={['Home', 'Settings']}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Navigation Sidebar */}
        <div className="space-y-4 lg:col-span-1">
          {/* Admin Identity Card */}
          <div className="card p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/20 text-lg font-bold text-primary-300 ring-2 ring-primary-400/30">
                  {userInitials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-slate-900 bg-emerald-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{initialName}</p>
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary-400" />
                  <span className="capitalize">{user?.role === 'admin' ? 'Health Authority' : user?.role || 'Admin'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <nav className="card p-2 space-y-1">
            {sections.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    setActive(s.key);
                    setErrorMsg('');
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-3 text-left transition-all ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-semibold shadow-xs ring-1 ring-primary-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isActive ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate leading-snug">{s.label}</p>
                    <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                      {s.key === 'profile' && 'Personal details'}
                      {s.key === 'password' && 'Security credentials'}
                      {s.key === 'notifications' && 'Alert delivery'}
                      {s.key === 'system' && 'Defaults & sync'}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Main Content Card */}
        <div className="card p-6 lg:col-span-3 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Status alerts */}
            {saved && (
              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-xs animate-in fade-in duration-200">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Settings updated successfully.</span>
              </div>
            )}
            {errorMsg && (
              <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-xs animate-in fade-in duration-200">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* TAB 1: PROFILE */}
            {active === 'profile' && (
              <div className="space-y-6">
                {/* Profile Header Card */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary-600 to-teal-500 text-2xl font-bold text-white shadow-md">
                        {userInitials}
                      </div>
                      <span
                        title="Active Administrator"
                        className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500"
                      >
                        <Check className="h-3 w-3 text-white" />
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900">{initialName}</h3>
                        <span className="badge bg-primary-100 text-primary-800 border border-primary-200 font-medium">
                          <ShieldCheck className="h-3 w-3 mr-0.5 text-primary-600" />
                          {user?.role === 'admin' ? 'Health Authority' : user?.role || 'Admin'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">{initialEmail}</p>
                    </div>
                  </div>

                  {!editing && (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="btn-secondary text-xs sm:text-sm shrink-0"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Details</h4>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="label flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-500" />
                        <span>Full Name</span>
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="input"
                          placeholder="e.g. Dr. Priya Sharma"
                        />
                      ) : (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800">
                          {form.name || 'Not provided'}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="label flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-500" />
                        <span>Email Address</span>
                      </label>
                      {editing ? (
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="input"
                          placeholder="admin@aquashield.org"
                        />
                      ) : (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 truncate">
                          {form.email || 'Not provided'}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="label flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-500" />
                        <span>Phone / Contact</span>
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="+91 98XXXXXXXX"
                          className="input"
                        />
                      ) : (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800">
                          {form.phone || 'Not provided'}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="label flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
                        <span>Jurisdiction & Role</span>
                      </label>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-700 flex items-center justify-between">
                        <span>{user?.role === 'admin' ? 'District Health Authority (Full Access)' : 'Standard Admin'}</span>
                        <span className="text-xs text-slate-400 font-mono">ID: #{user?.id || '1'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Metadata Info Box */}
                <div className="rounded-xl border border-primary-100 bg-primary-50/50 p-4 text-xs text-primary-900 flex items-start gap-3">
                  <Info className="h-4 w-4 text-primary-600 mt-0.5 shrink-0" />
                  <p className="leading-relaxed">
                    Health Authority accounts possess district-level broadcast clearance for emergency boil-water advisories and water contamination notifications. Changes to your registered email address also update your alert dispatch destination.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: PASSWORD */}
            {active === 'password' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Security Credentials</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Ensure your account uses a strong password of at least 8 characters with a mix of numbers and letters.
                  </p>
                </div>

                <div className="max-w-lg space-y-4">
                  <div>
                    <label className="label">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPw ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        className="input pr-10"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="label">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="input pr-10"
                        placeholder="At least 8 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="label">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPw ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="input pr-10"
                        placeholder="Re-enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw(!showConfirmPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Password Requirements helper */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5 text-xs">
                    <p className="font-semibold text-slate-700">Password Checklist:</p>
                    <div className="flex items-center gap-2 text-slate-600">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          passwordForm.newPassword.length >= 8 ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      />
                      <span>At least 8 characters long</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          passwordForm.newPassword && passwordForm.newPassword === passwordForm.confirmPassword
                            ? 'bg-emerald-500'
                            : 'bg-slate-300'
                        }`}
                      />
                      <span>Passwords match</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: NOTIFICATIONS */}
            {active === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Notification Preferences</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Control which risk alerts and emergency transmissions trigger administrative notifications.
                  </p>
                </div>

                {/* Group 1: Risk Alerts */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Risk Severity Channels</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <Toggle
                      label="Critical Emergency Alerts"
                      description="Instant alerts for lab-confirmed E. coli and critical contamination outbreaks"
                      badge={{ text: 'CRITICAL', color: 'bg-red-100 text-red-700 border border-red-200' }}
                      checked={notifPrefs.critical}
                      onChange={(v) => setNotifPrefs({ ...notifPrefs, critical: v })}
                    />
                    <Toggle
                      label="High Risk Warnings"
                      description="Early notification when predictive models forecast district disease escalation"
                      badge={{ text: 'HIGH', color: 'bg-amber-100 text-amber-800 border border-amber-200' }}
                      checked={notifPrefs.high}
                      onChange={(v) => setNotifPrefs({ ...notifPrefs, high: v })}
                    />
                    <Toggle
                      label="Medium Risk Advisories"
                      description="Water quality anomalies and seasonal fluctuation notices"
                      badge={{ text: 'MEDIUM', color: 'bg-blue-100 text-blue-800 border border-blue-200' }}
                      checked={notifPrefs.medium}
                      onChange={(v) => setNotifPrefs({ ...notifPrefs, medium: v })}
                    />
                  </div>
                </div>

                {/* Group 2: Delivery Channels */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Delivery Channels</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <Toggle
                      label="Email Notifications"
                      description="Dispatch immediate alert digests and action directives to the registered admin email"
                      checked={notifPrefs.email}
                      onChange={(v) => setNotifPrefs({ ...notifPrefs, email: v })}
                    />
                    <Toggle
                      label="SMS Emergency Dispatch"
                      description="Send high-priority SMS messages to registered health worker mobiles"
                      checked={notifPrefs.sms}
                      onChange={(v) => setNotifPrefs({ ...notifPrefs, sms: v })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SYSTEM PREFERENCES */}
            {active === 'system' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">System Preferences</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Configure real-time dashboard data refresh cadences, predictive threshold triggers, and timezone defaults.
                  </p>
                </div>

                <div className="space-y-5">
                  <Toggle
                    label="Auto-refresh Dashboard"
                    description="Automatically synchronize live water quality feeds and predictive risk cards every 5 minutes"
                    checked={systemPrefs.autoRefresh}
                    onChange={(v) => setSystemPrefs({ ...systemPrefs, autoRefresh: v })}
                  />

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="label flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary-600" />
                        <span>AI Anomaly Threshold</span>
                      </label>
                      <select
                        value={systemPrefs.riskThreshold}
                        onChange={(e) => setSystemPrefs({ ...systemPrefs, riskThreshold: e.target.value })}
                        className="input"
                      >
                        <option value="35">Medium Sensitivity (Risk Score 35%+)</option>
                        <option value="60">Standard Sensitivity (Risk Score 60%+)</option>
                        <option value="80">Strict Critical Only (Risk Score 80%+)</option>
                      </select>
                      <p className="mt-1 text-xs text-slate-500">
                        Determines the sensitivity cutoff for automated outbreak warnings.
                      </p>
                    </div>

                    <div>
                      <label className="label flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        <span>Timezone</span>
                      </label>
                      <select
                        value={systemPrefs.timezone}
                        onChange={(e) => setSystemPrefs({ ...systemPrefs, timezone: e.target.value })}
                        className="input"
                      >
                        <option value="IST (UTC+5:30)">IST (UTC+5:30) - Indian Standard Time</option>
                        <option value="UTC (UTC+0:00)">UTC (UTC+0:00) - Coordinated Universal Time</option>
                        <option value="EST (UTC-5:00)">EST (UTC-5:00) - Eastern Standard Time</option>
                      </select>
                      <p className="mt-1 text-xs text-slate-500">
                        Applied to all sensor telemetry and laboratory test timestamps.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-primary-600" />
                      <span>Local Client Storage Cache: Healthy (Preferences synced)</span>
                    </div>
                    <span className="badge bg-slate-200 text-slate-700">v1.2.0</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="mt-8 pt-5 border-t border-slate-200 flex items-center justify-end gap-3">
            {active === 'profile' && !editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="btn-primary"
              >
                Edit Profile
              </button>
            ) : (
              <>
                {active === 'profile' && (
                  <button
                    type="button"
                    onClick={handleCancelProfile}
                    disabled={saving}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : active === 'password' ? 'Update Password' : 'Save Changes'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Robust Toggle component ensuring the switch knob stays 100% inside the track
 * with proper inline-flex containment and border constraints.
 */
function Toggle({
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
