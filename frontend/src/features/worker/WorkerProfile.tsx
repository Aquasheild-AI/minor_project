import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  MapPin,
  Phone,
  LogOut,
  HeartPulse,
  Check,
  ShieldCheck,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toast } from '@/components/ui/Toast';
import { useAuth, type AssignedVillageInfo } from '@/hooks/useAuth';

export function WorkerProfile() {
  const navigate = useNavigate();
  const { user, logout, updateProfile, refreshUser } = useAuth();
  const [assignedVillagesList, setAssignedVillagesList] = useState<AssignedVillageInfo[]>(
    user?.assignedVillagesList || []
  );
  const [toastMsg, setToastMsg] = useState('');
  const [toastShow, setToastShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // Sync assigned villages directly from authenticated user state and fetch fresh data from backend
  useEffect(() => {
    refreshUser().then((u) => {
      if (u?.assignedVillagesList) {
        setAssignedVillagesList(u.assignedVillagesList);
      }
    });
  }, [refreshUser]);

  useEffect(() => {
    if (user?.assignedVillagesList) {
      setAssignedVillagesList(user.assignedVillagesList);
    }
  }, [user?.assignedVillagesList]);

  const initialName = user?.name || user?.username || 'Health Worker';
  const initialEmail = user?.email ?? '';
  const initialPhone = user?.phone ?? '';

  const [form, setForm] = useState({
    name: initialName,
    email: initialEmail,
    phone: initialPhone,
  });

  // Sync form when user loads
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || user.username || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const userInitials = (initialName || 'HW')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSave = async () => {
    setSaving(true);
    try {
      const parts = form.name.trim().split(' ');
      const first_name = parts[0] || '';
      const last_name = parts.slice(1).join(' ') || '';

      await updateProfile({ first_name, last_name, email: form.email, phone: form.phone });
      setToastMsg('Profile updated successfully.');
      setToastShow(true);
      setEditing(false);
    } catch (err: any) {
      setToastMsg(err.message || 'Failed to update profile.');
      setToastShow(true);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setForm({
      name: user?.name || user?.username || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        subtitle="View and update your health worker profile information."
        breadcrumb={['Home', 'Profile']}
      />

      <Toast message={toastMsg} show={toastShow} onClose={() => setToastShow(false)} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Worker Profile Card */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-2xl font-bold text-white shadow-md">
                  {userInitials}
                </div>
                <span
                  title="Active Health Worker"
                  className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500"
                >
                  <Check className="h-3 w-3 text-white" />
                </span>
              </div>
              <h3 className="mt-3.5 text-lg font-bold text-slate-900">{initialName}</h3>
              <p className="text-sm text-slate-500">{initialEmail || 'No email provided'}</p>
              <div className="mt-2.5">
                <span className="badge bg-teal-100 text-teal-800 border border-teal-200 font-medium inline-flex items-center gap-1">
                  <HeartPulse className="h-3.5 w-3.5 text-teal-600" />
                  Health Worker
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3.5 border-t border-slate-200 pt-5 text-sm">
              <div className="flex items-center gap-3 text-slate-700">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <span className="truncate">{initialEmail || 'No email provided'}</span>
              </div>

              <div className="flex items-center gap-3 text-slate-700">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <span>{initialPhone || 'No phone registered'}</span>
              </div>

              <div className="flex items-center gap-3 text-slate-700">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600 shrink-0">
                  <HeartPulse className="h-4 w-4" />
                </div>
                <span>
                  {assignedVillagesList.length} assigned {assignedVillagesList.length === 1 ? 'village' : 'villages'} under surveillance
                </span>
              </div>

              <div className="flex items-center gap-3 text-slate-700">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span>Active Jurisdiction Account</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="btn-secondary mt-6 w-full text-red-600 hover:bg-red-50 hover:text-red-700 border-slate-200 transition-colors inline-flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>

        {/* Right Column: Edit Profile & Assigned Villages */}
        <div className="card p-6 lg:col-span-2 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Profile Information</h3>
              <p className="mt-1 text-xs text-slate-500">
                You can update your personal name and contact information. Your assigned jurisdiction villages are configured by Health Authorities.
              </p>
            </div>

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
                    placeholder="e.g. Anita Devi"
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
                    placeholder="worker@phc.gov.in"
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
                  <span>Phone Number</span>
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
                    {form.phone || '-'}
                  </div>
                )}
              </div>

              <div>
                <label className="label flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
                  <span>Role</span>
                </label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-700 flex items-center justify-between">
                  <span>Health Worker</span>
                  <span className="text-xs text-slate-400 font-mono">ID: #{user?.id || '-'}</span>
                </div>
              </div>
            </div>

            {/* Assigned Villages Section */}
            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Assigned Villages ({assignedVillagesList.length})
                </h4>
                <span className="text-xs text-slate-400">Configured by Health Authority</span>
              </div>

              {assignedVillagesList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/60 p-5 text-center text-xs text-amber-800">
                  <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-amber-500" />
                  <p className="font-semibold text-amber-900">No Villages Currently Assigned</p>
                  <p className="mt-1 text-slate-500">
                    Your account has not been assigned to any village jurisdictions yet. Contact your Health Authority administrator to map villages to your profile.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {assignedVillagesList.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-700 hover:border-teal-300 hover:bg-teal-50/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-700 shrink-0">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 truncate">{v.name}</p>
                          <p className="text-xs text-slate-500">District: {v.district}</p>
                        </div>
                      </div>
                      <span className="badge bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-medium shrink-0">
                        Assigned
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 pt-5 border-t border-slate-200 flex items-center justify-end gap-3">
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="btn-primary"
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
