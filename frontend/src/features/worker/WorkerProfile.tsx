import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, MapPin, Phone, LogOut, HeartPulse, Check } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';
import { healthWorker, assignedVillages } from '@/data/workerData';
import { formatDateTime } from '@/utils/risk';

export function WorkerProfile() {
  const navigate = useNavigate();
  const [toast, setToast] = useState(false);
  const [form, setForm] = useState({ name: healthWorker.name, email: healthWorker.email, phone: '+91 98765 43210' });

  return (
    <div>
      <PageHeader title="My Profile" subtitle="View and update your profile information." breadcrumb={['Home', 'Profile']} />

      <Toast message="Profile updated successfully." show={toast} onClose={() => setToast(false)} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="card p-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700">
              {healthWorker.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <h3 className="mt-3 text-lg font-bold text-slate-900">{healthWorker.name}</h3>
            <p className="text-sm text-slate-500">{healthWorker.email}</p>
            <div className="mt-2">
              <Badge variant="info">{healthWorker.role}</Badge>
            </div>
          </div>

          <div className="mt-6 space-y-3 border-t border-slate-200 pt-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">{healthWorker.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">{form.phone}</span>
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

          <button onClick={() => navigate('/')} className="btn-secondary mt-6 w-full text-risk-critical hover:bg-risk-critical-bg">
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
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input pl-10" />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input pl-10" />
              </div>
            </div>
            <div>
              <label className="label">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input pl-10" />
              </div>
            </div>
            <div>
              <label className="label">Role</label>
              <input type="text" value={healthWorker.role} disabled className="input bg-slate-50" />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button onClick={() => setToast(true)} className="btn-primary"><Check className="h-4 w-4" /> Save Changes</button>
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
