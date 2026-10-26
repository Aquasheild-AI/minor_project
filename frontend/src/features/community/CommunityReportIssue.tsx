import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Check, ArrowLeft, HeartPulse, Users, Calendar, StickyNote } from 'lucide-react';
import { communityApi } from '@/services/communityApi';
import { communityUser, communityVillages } from '@/data/communityData';
import type { Symptom } from '@/types';
import { useTranslation } from 'react-i18next';

const allSymptoms: Symptom[] = ['Fever', 'Diarrhea', 'Vomiting', 'Abdominal Pain', 'Dehydration', 'Headache', 'Other'];
const peopleOptions = ['1', '2-5', '6-10', '10+'];

const symptomLabels: Record<Symptom, { en: string; hi: string }> = {
  Fever: { en: 'Fever', hi: 'बुखार (Fever)' },
  Diarrhea: { en: 'Diarrhea', hi: 'दस्त (Diarrhea)' },
  Vomiting: { en: 'Vomiting', hi: 'उल्टी (Vomiting)' },
  'Abdominal Pain': { en: 'Abdominal Pain', hi: 'पेट दर्द (Abdominal Pain)' },
  Dehydration: { en: 'Dehydration', hi: 'निर्जलीकरण (Dehydration)' },
  Headache: { en: 'Headache', hi: 'सिरदर्द (Headache)' },
  Other: { en: 'Other', hi: 'अन्य (Other)' },
};

export function CommunityReportIssue() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isHi = i18n.language?.startsWith('hi');

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
    if (!villageId) e.village = isHi ? 'कृपया अपना गाँव चुनें' : 'Please select your village';
    if (symptoms.length === 0) e.symptoms = isHi ? 'कृपया कम से कम एक लक्षण चुनें' : 'Please select at least one symptom';
    if (!peopleAffected) e.people = isHi ? 'कृपया प्रभावित लोगों की संख्या चुनें' : 'Please select how many people are affected';
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
        <h2 className="text-xl font-bold text-slate-900">{isHi ? 'रिपोर्ट सफलतापूर्वक दर्ज की गई' : 'Report Submitted'}</h2>
        <p className="max-w-md text-sm text-slate-500">
          {t('community.reportIssue.form.success')}
        </p>
        <button onClick={() => navigate('/community/home')} className="btn-primary mt-4">
          {t('nav.home')}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t('community.reportIssue.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('community.reportIssue.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Location */}
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-slate-900">{t('common.village')}</h3>
          </div>
          <div>
            <label className="label">{t('common.village')}</label>
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
            <h3 className="text-sm font-semibold text-slate-900">{t('community.reportIssue.form.symptomsLabel')}</h3>
          </div>
          <p className="mb-3 text-xs text-slate-500">{isHi ? 'लागू होने वाले सभी लक्षण चुनें।' : 'Select all symptoms that apply.'}</p>
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
                {isHi ? symptomLabels[s].hi : symptomLabels[s].en}
              </button>
            ))}
          </div>
          {errors.symptoms && <p className="mt-2 text-xs text-risk-critical">{errors.symptoms}</p>}
        </div>

        {/* People Affected */}
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-slate-900">{isHi ? 'कितने लोग प्रभावित हैं?' : 'How many people are affected?'}</h3>
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
            <h3 className="text-sm font-semibold text-slate-900">{isHi ? 'आयु वर्ग (वैकल्पिक)' : 'Age Group (Optional)'}</h3>
          </div>
          <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="input">
            <option value="">{isHi ? 'आयु वर्ग चुनें (वैकल्पिक)' : 'Select age group (optional)'}</option>
            {['Under 5', '5-14', '15-30', '31-50', '51-65', '65+'].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Additional Info */}
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-slate-900">{isHi ? 'अतिरिक्त विवरण (वैकल्पिक)' : 'Additional Information (Optional)'}</h3>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder={t('community.reportIssue.form.notesPlaceholder')}
            className="input resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => navigate('/community/home')} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> {t('common.cancel')}
          </button>
          <button type="submit" disabled={saving} className="btn-primary px-8 py-3 text-base">
            {saving ? t('community.reportIssue.form.submitting') : t('community.reportIssue.form.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}
