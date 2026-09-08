import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Check, ArrowLeft, HeartPulse, Users, Calendar, StickyNote } from 'lucide-react';
import { communityApi } from '@/services/communityApi';
import { communityUser, communityVillages } from '@/data/communityData';
import type { Symptom } from '@/types';

const allSymptoms: Symptom[] = ['Fever', 'Diarrhea', 'Vomiting', 'Abdominal Pain', 'Dehydration', 'Headache', 'Other'];
const peopleOptions = ['1', '2-5', '6-10', '10+'];
const ageGroups = ['Under 5', '5-14', '15-30', '31-50', '51-65', '65+'];

export function CommunityReportIssue() {
  const navigate = useNavigate();
  const [villageId, setVillageId] = useState(communityUser.villageId);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [peopleAffected, setPeopleAffected] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const toggleSymptom = (s: Symptom) => {
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
    setErrors((e) => ({ ...e, symptoms: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!villageId) e.village = 'Please select your village';
    if (symptoms.length === 0) e.symptoms = 'Please select at least one symptom';
    if (!peopleAffected) e.people = 'Please select how many people are affected';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const village = communityVillages.find((v) => v.id === villageId);
    communityApi.createReport({
      date: new Date().toISOString().slice(0, 10),
      villageName: village?.name || communityUser.villageName,
      symptoms,
      peopleAffected,
      ageGroup: ageGroup || undefined,
      notes: notes || undefined,
    }).then(() => {
      setSaving(false);
      setSuccess(true);
    });
  };

  if (success) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-risk-low-bg">
          <Check className="h-10 w-10 text-risk-low" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Report Submitted</h2>
        <p className="max-w-md text-sm text-slate-500">
          Thank you. Your report has been recorded and may help health workers monitor conditions in your area.
        </p>
        <button onClick={() => navigate('/community/home')} className="btn-primary mt-4">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Report a Health Issue</h1>
        <p className="mt-1 text-sm text-slate-500">Help your community by reporting suspected health problems.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Location */}
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-slate-900">Your Village</h3>
          </div>
          <div>
            <label className="label">Village</label>
            <select value={villageId} onChange={(e) => setVillageId(e.target.value)} className={`input ${errors.village ? 'input-error' : ''}`}>
              {communityVillages.map((v) => <option key={v.id} value={v.id}>{v.name} — {v.district}</option>)}
            </select>
            {errors.village && <p className="mt-1 text-xs text-risk-critical">{errors.village}</p>}
          </div>
        </div>

        {/* Symptoms */}
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-slate-900">Symptoms</h3>
          </div>
          <p className="mb-3 text-xs text-slate-500">Select all symptoms that apply.</p>
          <div className="flex flex-wrap gap-2">
            {allSymptoms.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSymptom(s)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
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

        {/* People Affected */}
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-slate-900">How many people are affected?</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {peopleOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { setPeopleAffected(opt); setErrors((e) => ({ ...e, people: '' })); }}
                className={`rounded-lg border p-3 text-center text-sm font-medium transition-colors ${
                  peopleAffected === opt
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          {errors.people && <p className="mt-2 text-xs text-risk-critical">{errors.people}</p>}
        </div>

        {/* Age Group */}
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-slate-900">Age Group <span className="text-xs text-slate-400">(Optional)</span></h3>
          </div>
          <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="input">
            <option value="">Select age group (optional)</option>
            {ageGroups.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Additional Info */}
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-slate-900">Additional Information <span className="text-xs text-slate-400">(Optional)</span></h3>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Anything else you would like to report?"
            className="input resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => navigate('/community/home')} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary px-8 py-3 text-base">
            {saving ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </div>
  );
}
