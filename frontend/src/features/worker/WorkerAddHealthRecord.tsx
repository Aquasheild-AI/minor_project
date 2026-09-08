import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, HeartPulse, Activity, Check, ArrowLeft, StickyNote } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toast } from '@/components/ui/Toast';
import { assignedVillages } from '@/data/workerData';
import type { DiseaseCategory, Symptom, AgeGroup } from '@/types';

const diseases: DiseaseCategory[] = ['Cholera', 'Typhoid', 'Dysentery', 'Hepatitis', 'Diarrheal Disease', 'Other'];
const allSymptoms: Symptom[] = ['Fever', 'Diarrhea', 'Vomiting', 'Abdominal Pain', 'Dehydration', 'Headache', 'Other'];
const ageGroups: AgeGroup[] = ['Under 5', '5-14', '15-30', '31-50', '51-65', '65+'];

export function WorkerAddHealthRecord() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ villageId: '', reportingDate: '', diseaseCategory: '', suspectedCases: '', ageGroup: '', notes: '' });
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);

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
      setToast(true);
      setTimeout(() => navigate('/worker/health'), 1800);
    }, 800);
  };

  return (
    <div>
      <PageHeader
        title="Add Health Record"
        subtitle="Record suspected water-borne disease cases from your assigned village."
        breadcrumb={['Home', 'Health Records', 'Add Record']}
        actions={<button onClick={() => navigate('/worker/health')} className="btn-secondary"><ArrowLeft className="h-4 w-4" /> Back</button>}
      />

      <Toast message="Health record saved successfully." show={toast} onClose={() => setToast(false)} />

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {/* Section 1: Location */}
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-slate-900">Location</h3>
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

        {/* Section 4: Notes */}
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-slate-900">Additional Observations</h3>
            <span className="text-xs text-slate-400">(Optional)</span>
          </div>
          <textarea
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            rows={4}
            placeholder="Any additional observations about the reported cases..."
            className="input resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/worker/health')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Health Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
