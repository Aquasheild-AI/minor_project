import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, MapPin, Phone, LogOut, HeartPulse, Check } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';
import { healthWorker, assignedVillages } from '@/data/workerData';
import { formatDateTime } from '@/utils/risk';

import { useAuth } from '@/hooks/useAuth';

export function WorkerProfile() {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();
  const [toastMsg, setToastMsg] = useState('');
  const [toastShow, setToastShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  
  const initialName = user?.name || user?.username || healthWorker.name;
  const initialEmail = user?.email ?? '';
  const initialPhone = user?.phone ?? '';
  
  const [form, setForm] = useState({ name: initialName, email: initialEmail, phone: initialPhone });

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

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div>
      <PageHeader title="My Profile" subtitle="View and update your profile information." breadcrumb={['Home', 'Profile']} />

      <Toast message={toastMsg} show={toastShow} onClose={() => setToastShow(false)} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="card p-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700">
              {initialName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <h3 className="mt-3 text-lg font-bold text-slate-900">{initialName}</h3>
            <p className="text-sm text-slate-500">{initialEmail || 'No email provided'}</p>
            <div className="mt-2">
              <Badge variant="info">{user?.role === 'worker' ? 'Health Worker' : healthWorker.role}</Badge>
            </div>
          </div>

          <div className="mt-6 space-y-3 border-t border-slate-200 pt-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">{initialEmail || 'No email provided'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">{initialPhone || '-'}</span>
            </div>
            <div className="flex items-center gap-3">
              <HeartPulse className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">{assignedVillages.length} villages assigned</span>
            </div>
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">Last login: {formatDateTime(healthWorker.lastLogin)}</span>
            </div>
          </div>

          <button onClick={handleLogout} className="btn-secondary mt-6 w-full text-risk-critical hover:bg-risk-critical-bg">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>

        {/* Edit Profile */}
        <div className="card p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-900">Edit Profile</h3>
          <p className="mt-1 text-xs text-slate-500">You can update your name and contact information. Your role and assigned villages are managed by administrators.</p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                {editing ? (
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input pl-10" />
                ) : (
                  <div className="input pl-10 bg-slate-50 flex items-center text-slate-700">{form.name}</div>
                )}
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                {editing ? (
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input pl-10" />
                ) : (
                  <div className="input pl-10 bg-slate-50 flex items-center text-slate-700">{form.email}</div>
                )}
              </div>
            </div>
            <div>
              <label className="label">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                {editing ? (
                  <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input pl-10" />
                ) : (
                  <div className="input pl-10 bg-slate-50 flex items-center text-slate-700">{form.phone || '-'}</div>
                )}
              </div>
            </div>
            <div>
              <label className="label">Role</label>
              <input type="text" value={healthWorker.role} disabled className="input bg-slate-50" />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            {!editing ? (
              <button onClick={() => setEditing(true)} className="btn-secondary">Edit Profile</button>
            ) : (
              <>
                <button onClick={() => { setEditing(false); setForm({ name: initialName, email: initialEmail, phone: initialPhone }); }} disabled={saving} className="btn-secondary">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  <Check className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
          </div>

          {/* Assigned Villages */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Assigned Villages</h3>
            <div className="flex flex-wrap gap-2">
              {assignedVillages.map((v) => (
                <div key={v.id} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {v.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
