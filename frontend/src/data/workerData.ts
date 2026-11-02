import type { Village, HealthRecord, WaterQualityRecord, Alert, Notification, User, TrendPoint, RiskLevel, DiseaseCategory, Symptom } from '@/types';

// Health Worker profile
export const healthWorker: User = {
  id: 'u03',
  name: 'Anita Devi',
  email: 'anita.devi@phc.gov.in',
  role: 'Health Worker',
  status: 'active',
  lastLogin: '2026-08-20T06:45:00Z',
};

// Villages assigned to this health worker across Varanasi, Chandauli, and Ghazipur
export const assignedVillages: Village[] = [
  { id: 'wv01', name: 'Rampur', district: 'Varanasi', state: 'Uttar Pradesh', population: 8420, lat: 25.3176, lng: 82.9739, riskLevel: 'critical', riskScore: 91, suspectedCases: 47, waterStatus: 'unsafe', lastUpdated: '2026-08-20T08:30:00Z' },
  { id: 'wv02', name: 'Lakshmi Nagar', district: 'Varanasi', state: 'Uttar Pradesh', population: 6210, lat: 25.3356, lng: 83.0076, riskLevel: 'high', riskScore: 78, suspectedCases: 31, waterStatus: 'unsafe', lastUpdated: '2026-08-20T07:45:00Z' },
  { id: 'wv03', name: 'Shivpur', district: 'Varanasi', state: 'Uttar Pradesh', population: 5340, lat: 25.3501, lng: 83.0123, riskLevel: 'high', riskScore: 72, suspectedCases: 24, waterStatus: 'moderate', lastUpdated: '2026-08-20T06:20:00Z' },
  { id: 'wv04', name: 'Bhulanpur', district: 'Varanasi', state: 'Uttar Pradesh', population: 4870, lat: 25.3010, lng: 82.9550, riskLevel: 'medium', riskScore: 54, suspectedCases: 12, waterStatus: 'moderate', lastUpdated: '2026-08-20T05:10:00Z' },
  { id: 'wv05', name: 'Harhua', district: 'Varanasi', state: 'Uttar Pradesh', population: 7200, lat: 25.2800, lng: 82.9400, riskLevel: 'medium', riskScore: 48, suspectedCases: 9, waterStatus: 'moderate', lastUpdated: '2026-08-19T22:00:00Z' },
  { id: 'wv06', name: 'Chiraigaon', district: 'Varanasi', state: 'Uttar Pradesh', population: 6100, lat: 25.4100, lng: 83.0100, riskLevel: 'critical', riskScore: 88, suspectedCases: 38, waterStatus: 'unsafe', lastUpdated: '2026-08-20T09:00:00Z' },
  { id: 'wv07', name: 'Dhanapur', district: 'Chandauli', state: 'Uttar Pradesh', population: 4600, lat: 25.3100, lng: 83.1500, riskLevel: 'high', riskScore: 74, suspectedCases: 22, waterStatus: 'unsafe', lastUpdated: '2026-08-20T04:15:00Z' },
  { id: 'wv08', name: 'Sakaldiha', district: 'Chandauli', state: 'Uttar Pradesh', population: 5200, lat: 25.2900, lng: 83.1800, riskLevel: 'medium', riskScore: 52, suspectedCases: 10, waterStatus: 'moderate', lastUpdated: '2026-08-19T21:00:00Z' },
  { id: 'wv09', name: 'Chakia', district: 'Chandauli', state: 'Uttar Pradesh', population: 7850, lat: 25.0485, lng: 83.2195, riskLevel: 'high', riskScore: 76, suspectedCases: 28, waterStatus: 'unsafe', lastUpdated: '2026-08-20T08:15:00Z' },
  { id: 'wv10', name: 'Niyamatabad', district: 'Chandauli', state: 'Uttar Pradesh', population: 8300, lat: 25.2650, lng: 83.0850, riskLevel: 'critical', riskScore: 86, suspectedCases: 41, waterStatus: 'unsafe', lastUpdated: '2026-08-20T09:10:00Z' },
  { id: 'wv11', name: 'Bhadaura', district: 'Ghazipur', state: 'Uttar Pradesh', population: 3800, lat: 25.4500, lng: 83.2500, riskLevel: 'medium', riskScore: 49, suspectedCases: 7, waterStatus: 'moderate', lastUpdated: '2026-08-19T19:15:00Z' },
  { id: 'wv12', name: 'Saidpur', district: 'Ghazipur', state: 'Uttar Pradesh', population: 8100, lat: 25.5450, lng: 83.2250, riskLevel: 'critical', riskScore: 89, suspectedCases: 44, waterStatus: 'unsafe', lastUpdated: '2026-08-20T08:50:00Z' },
  { id: 'wv13', name: 'Mohammadabad', district: 'Ghazipur', state: 'Uttar Pradesh', population: 9400, lat: 25.6170, lng: 83.7540, riskLevel: 'high', riskScore: 73, suspectedCases: 27, waterStatus: 'unsafe', lastUpdated: '2026-08-20T07:20:00Z' },
  { id: 'wv14', name: 'Zamania', district: 'Ghazipur', state: 'Uttar Pradesh', population: 6700, lat: 25.4200, lng: 83.3000, riskLevel: 'low', riskScore: 28, suspectedCases: 5, waterStatus: 'safe', lastUpdated: '2026-08-19T16:00:00Z' },
];

const diseases: DiseaseCategory[] = ['Cholera', 'Typhoid', 'Dysentery', 'Hepatitis', 'Diarrheal Disease', 'Other'];
const allSymptoms: Symptom[] = ['Fever', 'Diarrhea', 'Vomiting', 'Abdominal Pain', 'Dehydration', 'Headache', 'Other'];
const ageGroups = ['Under 5', '5-14', '15-30', '31-50', '51-65', '65+'] as const;

function pickRisk(score: number): RiskLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function seedRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seedRandom(77);

export const workerHealthRecords: HealthRecord[] = Array.from({ length: 42 }, (_, i) => {
  const village = assignedVillages[i % assignedVillages.length];
  const disease = diseases[i % diseases.length];
  const cases = Math.floor(rand() * 35) + 1;
  const score = Math.floor(rand() * 100);
  const symCount = Math.floor(rand() * 4) + 1;
  const symptoms: Symptom[] = [];
  for (let j = 0; j < symCount; j++) {
    const s = allSymptoms[Math.floor(rand() * allSymptoms.length)];
    if (!symptoms.includes(s)) symptoms.push(s);
  }
  const day = (i % 20) + 1;
  return {
    id: `whr${String(i + 1).padStart(3, '0')}`,
    villageId: village.id,
    villageName: village.name,
    reportingDate: `2026-08-${String(day).padStart(2, '0')}`,
    diseaseCategory: disease,
    suspectedCases: cases,
    symptoms: symptoms.length ? symptoms : ['Fever'],
    ageGroup: ageGroups[i % ageGroups.length] as HealthRecord['ageGroup'],
    riskLevel: pickRisk(score),
    reportedBy: 'Anita Devi',
  };
});

export const workerWaterQuality: WaterQualityRecord[] = Array.from({ length: 30 }, (_, i) => {
  const village = assignedVillages[i % assignedVillages.length];
  const ph = +(5.8 + rand() * 2.8).toFixed(1);
  const turbidity = +(0.5 + rand() * 9).toFixed(1);
  const temperature = +(22 + rand() * 10).toFixed(1);
  const tds = Math.floor(200 + rand() * 700);
  const status: 'safe' | 'moderate' | 'unsafe' =
    ph < 6.5 || ph > 8.5 || turbidity > 5 || tds > 500 ? 'unsafe' : turbidity > 3 || tds > 300 ? 'moderate' : 'safe';
  const day = (i % 20) + 1;
  return {
    id: `wwq${String(i + 1).padStart(3, '0')}`,
    villageId: village.id,
    villageName: village.name,
    date: `2026-08-${String(day).padStart(2, '0')}`,
    ph,
    turbidity,
    temperature,
    tds,
    status,
  };
});
