import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Droplets, Thermometer, Beaker, Activity } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toast } from '@/components/ui/Toast';
import { assignedVillages } from '@/data/workerData';
import { phStatus, tdsStatus, turbidityStatus } from '@/utils/risk';

export function WorkerAddWaterQuality() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ villageId: '', date: '', ph: '', turbidity: '', temperature: '', tds: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);

  const update = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.villageId) e.villageId = 'Please select a village';
    if (!form.date) e.date = 'Please select a date';
    if (!form.ph) e.ph = 'Required';
    else if (parseFloat(form.ph) < 0 || parseFloat(form.ph) > 14) e.ph = 'pH must be 0-14';
    if (!form.turbidity) e.turbidity = 'Required';
    if (!form.temperature) e.temperature = 'Required';
    if (!form.tds) e.tds = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setToast(true);
      setTimeout(() => navigate('/worker/water-quality'), 1800);
    }, 800);
  };

  const phVal = parseFloat(form.ph);
  const tdsVal = parseFloat(form.tds);
  const turbVal = parseFloat(form.turbidity);

  return (
    <div>
      <PageHeader
        title="Add Water Quality Observation"
        subtitle="Record a new water-quality sample from your assigned village."
        breadcrumb={['Home', 'Water Quality', 'Add Record']}
        actions={<button onClick={() => navigate('/worker/water-quality')} className="btn-secondary"><ArrowLeft className="h-4 w-4" /> Back</button>}
      />

      <Toast message="Water-quality observation saved successfully." show={toast} onClose={() => setToast(false)} />

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Droplets className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-slate-900">Water Sample Details</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Village *</label>
              <select value={form.villageId} onChange={(e) => update('villageId', e.target.value)} className={`input ${errors.villageId ? 'input-error' : ''}`}>
                <option value="">Select village</option>
                {assignedVillages.map((v) => <option key={v.id} value={v.id}>{v.name} — {v.district}</option>)}
              </select>
              {errors.villageId && <p className="mt-1 text-xs text-risk-critical">{errors.villageId}</p>}
            </div>
            <div>
              <label className="label">Sample Date *</label>
              <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} className={`input ${errors.date ? 'input-error' : ''}`} />
              {errors.date && <p className="mt-1 text-xs text-risk-critical">{errors.date}</p>}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">pH Level (0-14) *</label>
              <div className="relative">
                <Beaker className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="number" step="0.1" min="0" max="14" value={form.ph} onChange={(e) => update('ph', e.target.value)} placeholder="7.0" className={`input pl-10 ${errors.ph ? 'input-error' : ''}`} />
              </div>
              {errors.ph ? <p className="mt-1 text-xs text-risk-critical">{errors.ph}</p> : form.ph ? (
                <p className={`mt-1 text-xs ${phStatus(phVal).status === 'safe' ? 'text-risk-low' : 'text-risk-medium'}`}>{phStatus(phVal).label}</p>
              ) : null}
            </div>
            <div>
              <label className="label">Turbidity (NTU) *</label>
              <div className="relative">
                <Activity className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="number" step="0.1" min="0" value={form.turbidity} onChange={(e) => update('turbidity', e.target.value)} placeholder="2.5" className={`input pl-10 ${errors.turbidity ? 'input-error' : ''}`} />
              </div>
              {errors.turbidity ? <p className="mt-1 text-xs text-risk-critical">{errors.turbidity}</p> : form.turbidity ? (
                <p className={`mt-1 text-xs ${turbidityStatus(turbVal).status === 'safe' ? 'text-risk-low' : turbidityStatus(turbVal).status === 'warn' ? 'text-risk-medium' : 'text-risk-critical'}`}>{turbidityStatus(turbVal).label}</p>
              ) : null}
            </div>
            <div>
              <label className="label">Temperature (°C) *</label>
              <div className="relative">
                <Thermometer className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="number" step="0.1" value={form.temperature} onChange={(e) => update('temperature', e.target.value)} placeholder="27.5" className={`input pl-10 ${errors.temperature ? 'input-error' : ''}`} />
              </div>
              {errors.temperature && <p className="mt-1 text-xs text-risk-critical">{errors.temperature}</p>}
            </div>
            <div>
              <label className="label">TDS (ppm) *</label>
              <div className="relative">
                <Droplets className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="number" min="0" value={form.tds} onChange={(e) => update('tds', e.target.value)} placeholder="350" className={`input pl-10 ${errors.tds ? 'input-error' : ''}`} />
              </div>
              {errors.tds ? <p className="mt-1 text-xs text-risk-critical">{errors.tds}</p> : form.tds ? (
                <p className={`mt-1 text-xs ${tdsStatus(tdsVal).status === 'safe' ? 'text-risk-low' : 'text-risk-medium'}`}>{tdsStatus(tdsVal).label}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/worker/water-quality')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Observation'}</button>
        </div>
      </form>
    </div>
  );
}
