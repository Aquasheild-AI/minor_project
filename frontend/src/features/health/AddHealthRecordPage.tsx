import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, HeartPulse, Activity, Check, ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { villages } from '@/data/mockData';
import { riskFromScore } from '@/utils/risk';
import type { DiseaseCategory, Symptom, AgeGroup } from '@/types';

const diseases: DiseaseCategory[] = ['Cholera', 'Typhoid', 'Dysentery', 'Hepatitis', 'Diarrheal Disease', 'Other'];
const allSymptoms: Symptom[] = ['Fever', 'Diarrhea', 'Vomiting', 'Abdominal Pain', 'Dehydration', 'Headache', 'Other'];
const ageGroups: AgeGroup[] = ['0-5', '6-12', '13-18', '19-40', '41-60', '60+'];

export function AddHealthRecordPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    villageId: '',
    district: '',
    reportingDate: '',
    diseaseCategory: '',
    suspectedCases: '',
    ageGroup: '',
  });
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const toggleSymptom = (s: Symptom) => {
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.villageId) e.villageId = 'Please select a village';
    if (!form.reportingDate) e.reportingDate = 'Please select a date';
    if (!form.diseaseCategory) e.diseaseCategory = 'Please select a disease';
    if (!form.suspectedCases) e.suspectedCases = 'Please enter number of cases';
    else if (parseInt(form.suspectedCases) < 1) e.suspectedCases = 'Must be at least 1';
    if (!form.ageGroup) e.ageGroup = 'Please select an age group';
    if (symptoms.length === 0) e.symptoms = 'Select at least one symptom';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSuccess(true);
      setTimeout(() => navigate('/health'), 1500);
    }, 800);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-risk-low-bg">
          <Check className="h-8 w-8 text-risk-low" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Health Record Saved</h2>
        <p className="text-sm text-slate-500">The record has been added successfully.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Add Health Record"
        subtitle="Record a new community health report for a monitored village."
        breadcrumb={['Home', 'Health Surveillance', 'Add Record']}
        actions={<button onClick={() => navigate('/health')} className="btn-secondary"><ArrowLeft className="h-4 w-4" /> Back</button>}
      />

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {/* Section 1: Location */}
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-slate-900">Location</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Village *</label>
              <select value={form.villageId} onChange={(e) => update('villageId', e.target.value)} className={`input ${errors.villageId ? 'input-error' : ''}`}>
                <option value="">Select village</option>
                {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              {errors.villageId && <p className="mt-1 text-xs text-risk-critical">{errors.villageId}</p>}
            </div>
            <div>
              <label className="label">District</label>
              <input type="text" value={form.district} onChange={(e) => update('district', e.target.value)} placeholder="Auto-filled from village" className="input" />
            </div>
            <div>
              <label className="label">Reporting Date *</label>
              <input type="date" value={form.reportingDate} onChange={(e) => update('reportingDate', e.target.value)} className={`input ${errors.reportingDate ? 'input-error' : ''}`} />
              {errors.reportingDate && <p className="mt-1 text-xs text-risk-critical">{errors.reportingDate}</p>}
            </div>
          </div>
        </div>

        {/* Section 2: Disease Information */}
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-slate-900">Disease Information</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Disease Category *</label>
              <select value={form.diseaseCategory} onChange={(e) => update('diseaseCategory', e.target.value)} className={`input ${errors.diseaseCategory ? 'input-error' : ''}`}>
                <option value="">Select disease</option>
                {diseases.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.diseaseCategory && <p className="mt-1 text-xs text-risk-critical">{errors.diseaseCategory}</p>}
            </div>
            <div>
              <label className="label">Suspected Cases *</label>
              <input type="number" min="1" value={form.suspectedCases} onChange={(e) => update('suspectedCases', e.target.value)} placeholder="0" className={`input ${errors.suspectedCases ? 'input-error' : ''}`} />
              {errors.suspectedCases && <p className="mt-1 text-xs text-risk-critical">{errors.suspectedCases}</p>}
            </div>
            <div>
              <label className="label">Age Group *</label>
              <select value={form.ageGroup} onChange={(e) => update('ageGroup', e.target.value)} className={`input ${errors.ageGroup ? 'input-error' : ''}`}>
                <option value="">Select age group</option>
                {ageGroups.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              {errors.ageGroup && <p className="mt-1 text-xs text-risk-critical">{errors.ageGroup}</p>}
            </div>
          </div>
        </div>

        {/* Section 3: Symptoms */}
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-slate-900">Symptoms</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {allSymptoms.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSymptom(s)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  symptoms.includes(s)
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {symptoms.includes(s) && <Check className="mr-1 inline h-3.5 w-3.5" />}
                {s}
              </button>
            ))}
          </div>
          {errors.symptoms && <p className="mt-2 text-xs text-risk-critical">{errors.symptoms}</p>}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/health')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
