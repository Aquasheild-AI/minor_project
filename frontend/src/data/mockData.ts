import type {
  Village,
  HealthRecord,
  WaterQualityRecord,
  RiskPrediction,
  Alert,
  Notification,
  User,
  TrendPoint,
  RiskLevel,
  DiseaseCategory,
  Symptom,
} from '@/types';

export const villages: Village[] = [
  { id: 'v01', name: 'Rampur', district: 'Varanasi', state: 'Uttar Pradesh', population: 8420, lat: 25.3176, lng: 82.9739, riskLevel: 'critical', riskScore: 91, suspectedCases: 47, waterStatus: 'unsafe', lastUpdated: '2026-08-20T08:30:00Z' },
  { id: 'v02', name: 'Lakshmi Nagar', district: 'Varanasi', state: 'Uttar Pradesh', population: 6210, lat: 25.3356, lng: 83.0076, riskLevel: 'high', riskScore: 78, suspectedCases: 31, waterStatus: 'unsafe', lastUpdated: '2026-08-20T07:45:00Z' },
  { id: 'v03', name: 'Shivpur', district: 'Varanasi', state: 'Uttar Pradesh', population: 5340, lat: 25.3501, lng: 83.0123, riskLevel: 'high', riskScore: 72, suspectedCases: 24, waterStatus: 'moderate', lastUpdated: '2026-08-20T06:20:00Z' },
  { id: 'v04', name: 'Bhulanpur', district: 'Varanasi', state: 'Uttar Pradesh', population: 4870, lat: 25.3010, lng: 82.9550, riskLevel: 'medium', riskScore: 54, suspectedCases: 12, waterStatus: 'moderate', lastUpdated: '2026-08-20T05:10:00Z' },
  { id: 'v05', name: 'Harhua', district: 'Varanasi', state: 'Uttar Pradesh', population: 7200, lat: 25.2800, lng: 82.9400, riskLevel: 'medium', riskScore: 48, suspectedCases: 9, waterStatus: 'moderate', lastUpdated: '2026-08-19T22:00:00Z' },
  { id: 'v06', name: 'Kashi Vidyapeeth', district: 'Varanasi', state: 'Uttar Pradesh', population: 5600, lat: 25.2650, lng: 82.9900, riskLevel: 'low', riskScore: 22, suspectedCases: 3, waterStatus: 'safe', lastUpdated: '2026-08-19T20:30:00Z' },
  { id: 'v07', name: 'Cholapur', district: 'Varanasi', state: 'Uttar Pradesh', population: 6800, lat: 25.2400, lng: 83.0200, riskLevel: 'low', riskScore: 18, suspectedCases: 2, waterStatus: 'safe', lastUpdated: '2026-08-19T18:00:00Z' },
  { id: 'v08', name: 'Sevapuri', district: 'Varanasi', state: 'Uttar Pradesh', population: 5100, lat: 25.2200, lng: 82.8500, riskLevel: 'medium', riskScore: 51, suspectedCases: 11, waterStatus: 'moderate', lastUpdated: '2026-08-19T16:45:00Z' },
  { id: 'v09', name: 'Araziline', district: 'Varanasi', state: 'ttar Pradesh', population: 4900, lat: 25.2600, lng: 82.8700, riskLevel: 'high', riskScore: 69, suspectedCases: 19, waterStatus: 'unsafe', lastUpdated: '2026-08-19T15:20:00Z' },
  { id: 'v10', name: 'Pindra', district: 'Varanasi', state: 'Uttar Pradesh', population: 6300, lat: 25.3800, lng: 82.9200, riskLevel: 'low', riskScore: 25, suspectedCases: 4, waterStatus: 'safe', lastUpdated: '2026-08-19T14:00:00Z' },
  { id: 'v11', name: 'Baragaon', district: 'Varanasi', state: 'Uttar Pradesh', population: 5700, lat: 25.3900, lng: 82.9800, riskLevel: 'medium', riskScore: 45, suspectedCases: 8, waterStatus: 'moderate', lastUpdated: '2026-08-19T12:30:00Z' },
  { id: 'v12', name: 'Chiraigaon', district: 'Varanasi', state: 'Uttar Pradesh', population: 6100, lat: 25.4100, lng: 83.0100, riskLevel: 'critical', riskScore: 88, suspectedCases: 38, waterStatus: 'unsafe', lastUpdated: '2026-08-20T09:00:00Z' },
  { id: 'v13', name: 'Dhanapur', district: 'Chandauli', state: 'Uttar Pradesh', population: 4600, lat: 25.3100, lng: 83.1500, riskLevel: 'high', riskScore: 74, suspectedCases: 22, waterStatus: 'unsafe', lastUpdated: '2026-08-20T04:15:00Z' },
  { id: 'v14', name: 'Sakaldiha', district: 'Chandauli', state: 'Uttar Pradesh', population: 5200, lat: 25.2900, lng: 83.1800, riskLevel: 'medium', riskScore: 52, suspectedCases: 10, waterStatus: 'moderate', lastUpdated: '2026-08-19T21:00:00Z' },
  { id: 'v15', name: 'Chahniya', district: 'Chandauli', state: 'Uttar Pradesh', population: 4300, lat: 25.2700, lng: 83.2000, riskLevel: 'low', riskScore: 20, suspectedCases: 3, waterStatus: 'safe', lastUpdated: '2026-08-19T17:30:00Z' },
  { id: 'v16', name: 'Mughalsarai', district: 'Chandauli', state: 'Uttar Pradesh', population: 9100, lat: 25.2800, lng: 83.1200, riskLevel: 'high', riskScore: 71, suspectedCases: 26, waterStatus: 'unsafe', lastUpdated: '2026-08-20T03:40:00Z' },
  { id: 'v17', name: 'Bhadaura', district: 'Ghazipur', state: 'Uttar Pradesh', population: 3800, lat: 25.4500, lng: 83.2500, riskLevel: 'medium', riskScore: 49, suspectedCases: 7, waterStatus: 'moderate', lastUpdated: '2026-08-19T19:15:00Z' },
  { id: 'v18', name: 'Zamania', district: 'Ghazipur', state: 'Uttar Pradesh', population: 6700, lat: 25.4200, lng: 83.3000, riskLevel: 'low', riskScore: 28, suspectedCases: 5, waterStatus: 'safe', lastUpdated: '2026-08-19T16:00:00Z' },
];

const diseases: DiseaseCategory[] = ['Cholera', 'Typhoid', 'Dysentery', 'Hepatitis', 'Diarrheal Disease', 'Other'];
const allSymptoms: Symptom[] = ['Fever', 'Diarrhea', 'Vomiting', 'Abdominal Pain', 'Dehydration', 'Headache', 'Other'];
const ageGroups = ['0-5', '6-12', '13-18', '19-40', '41-60', '60+'] as const;

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

const rand = seedRandom(42);

export const healthRecords: HealthRecord[] = Array.from({ length: 48 }, (_, i) => {
  const village = villages[i % villages.length];
  const disease = diseases[i % diseases.length];
  const cases = Math.floor(rand() * 40) + 1;
  const score = Math.floor(rand() * 100);
  const symCount = Math.floor(rand() * 4) + 1;
  const symptoms: Symptom[] = [];
  for (let j = 0; j < symCount; j++) {
    const s = allSymptoms[Math.floor(rand() * allSymptoms.length)];
    if (!symptoms.includes(s)) symptoms.push(s);
  }
  const day = (i % 30) + 1;
  return {
    id: `hr${String(i + 1).padStart(3, '0')}`,
    villageId: village.id,
    villageName: village.name,
    reportingDate: `2026-08-${String(day).padStart(2, '0')}`,
    diseaseCategory: disease,
    suspectedCases: cases,
    symptoms: symptoms.length ? symptoms : ['Fever'],
    ageGroup: ageGroups[i % ageGroups.length],
    riskLevel: pickRisk(score),
    reportedBy: ['Dr. Anjali Verma', 'Dr. Ramesh Singh', 'Nurse Priya Yadav', 'Worker Suresh Kumar'][i % 4],
  };
});

export const waterQualityRecords: WaterQualityRecord[] = Array.from({ length: 36 }, (_, i) => {
  const village = villages[i % villages.length];
  const ph = +(5.8 + rand() * 2.8).toFixed(1);
  const turbidity = +(0.5 + rand() * 8).toFixed(1);
  const temperature = +(22 + rand() * 10).toFixed(1);
  const tds = Math.floor(200 + rand() * 700);
  const status: 'safe' | 'moderate' | 'unsafe' =
    ph < 6.5 || ph > 8.5 || turbidity > 5 || tds > 500 ? 'unsafe' : turbidity > 3 || tds > 300 ? 'moderate' : 'safe';
  const day = (i % 20) + 1;
  return {
    id: `wq${String(i + 1).padStart(3, '0')}`,
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

export function getRiskPrediction(villageId: string, date: string): RiskPrediction {
  const village = villages.find((v) => v.id === villageId) || villages[0];
  const score = village.riskScore;
  return {
    villageId: village.id,
    villageName: village.name,
    date,
    riskScore: score,
    riskLevel: village.riskLevel,
    confidence: Math.min(98, 70 + Math.floor(rand() * 25)),
    factors: [
      { label: 'High suspected cases', impact: score > 70 ? 'high' : 'medium', detail: `${village.suspectedCases} suspected cases reported in the last 7 days` },
      { label: 'Elevated turbidity', impact: 'medium', detail: 'Turbidity readings above preferred range' },
      { label: 'High TDS', impact: 'medium', detail: 'Total dissolved solids exceeding safe threshold' },
    ],
    recommendation: 'Health authorities should review the reported cases and water-quality conditions for this village.',
  };
}

export const alerts: Alert[] = [
  {
    id: 'a01',
    severity: 'critical',
    villageId: 'v01',
    villageName: 'Rampur',
    riskScore: 91,
    message: 'Critical disease-risk level detected',
    factors: ['Rapid increase in suspected cases', 'Elevated turbidity', 'High TDS'],
    detectedAt: '2026-08-20T08:18:00Z',
    status: 'active',
    read: false,
  },
  {
    id: 'a02',
    severity: 'critical',
    villageId: 'v12',
    villageName: 'Chiraigaon',
    riskScore: 88,
    message: 'Critical disease-risk level detected',
    factors: ['Spike in diarrheal cases', 'Unsafe water quality readings'],
    detectedAt: '2026-08-20T09:00:00Z',
    status: 'active',
    read: false,
  },
  {
    id: 'a03',
    severity: 'high',
    villageId: 'v02',
    villageName: 'Lakshmi Nagar',
    riskScore: 78,
    message: 'High disease-risk level detected',
    factors: ['Elevated turbidity', 'Increasing suspected cases'],
    detectedAt: '2026-08-20T07:38:00Z',
    status: 'active',
    read: false,
  },
  {
    id: 'a04',
    severity: 'high',
    villageId: 'v13',
    villageName: 'Dhanapur',
    riskScore: 74,
    message: 'High disease-risk level detected',
    factors: ['High TDS levels', 'Moderate case increase'],
    detectedAt: '2026-08-20T04:10:00Z',
    status: 'under_review',
    read: true,
  },
  {
    id: 'a05',
    severity: 'high',
    villageId: 'v16',
    villageName: 'Mughalsarai',
    riskScore: 71,
    message: 'High disease-risk level detected',
    factors: ['Unsafe water quality', 'Population density'],
    detectedAt: '2026-08-20T03:35:00Z',
    status: 'active',
    read: true,
  },
  {
    id: 'a06',
    severity: 'medium',
    villageId: 'v04',
    villageName: 'Bhulanpur',
    riskScore: 54,
    message: 'Medium disease-risk level detected',
    factors: ['Moderate turbidity', 'Seasonal case patterns'],
    detectedAt: '2026-08-19T22:00:00Z',
    status: 'under_review',
    read: true,
  },
  {
    id: 'a07',
    severity: 'medium',
    villageId: 'v05',
    villageName: 'Harhua',
    riskScore: 48,
    message: 'Medium disease-risk level detected',
    factors: ['TDS near threshold'],
    detectedAt: '2026-08-19T18:30:00Z',
    status: 'resolved',
    read: true,
  },
  {
    id: 'a08',
    severity: 'high',
    villageId: 'v03',
    villageName: 'Shivpur',
    riskScore: 72,
    message: 'High disease-risk level detected',
    factors: ['Elevated turbidity', 'High suspected cases'],
    detectedAt: '2026-08-19T15:00:00Z',
    status: 'resolved',
    read: true,
  },
];

export const notifications: Notification[] = [
  { id: 'n01', type: 'alert', severity: 'critical', message: 'Critical disease-risk level detected', villageName: 'Rampur', time: '2026-08-20T08:18:00Z', read: false },
  { id: 'n02', type: 'alert', severity: 'critical', message: 'Critical disease-risk level detected', villageName: 'Chiraigaon', time: '2026-08-20T09:00:00Z', read: false },
  { id: 'n03', type: 'alert', severity: 'high', message: 'High disease-risk level detected', villageName: 'Lakshmi Nagar', time: '2026-08-20T07:38:00Z', read: false },
  { id: 'n04', type: 'water', severity: 'info', message: 'Water-quality warning: turbidity above safe range', villageName: 'Dhanapur', time: '2026-08-20T04:10:00Z', read: false },
  { id: 'n05', type: 'health', severity: 'info', message: 'New health record submitted for Shivpur', villageName: 'Shivpur', time: '2026-08-20T06:20:00Z', read: true },
  { id: 'n06', type: 'system', severity: 'info', message: 'Risk prediction model updated successfully', time: '2026-08-19T20:00:00Z', read: true },
];

export const users: User[] = [
  { id: 'u01', name: 'Dr. Anjali Verma', email: 'anjali.verma@health.gov.in', role: 'Admin', status: 'active', lastLogin: '2026-08-20T08:00:00Z' },
  { id: 'u02', name: 'Dr. Ramesh Singh', email: 'ramesh.singh@health.gov.in', role: 'Authority', status: 'active', lastLogin: '2026-08-20T07:30:00Z' },
  { id: 'u03', name: 'Priya Yadav', email: 'priya.yadav@health.gov.in', role: 'Health Worker', status: 'active', lastLogin: '2026-08-20T06:45:00Z' },
  { id: 'u04', name: 'Suresh Kumar', email: 'suresh.kumar@health.gov.in', role: 'Health Worker', status: 'active', lastLogin: '2026-08-19T22:10:00Z' },
  { id: 'u05', name: 'Dr. Meena Sharma', email: 'meena.sharma@health.gov.in', role: 'Authority', status: 'active', lastLogin: '2026-08-19T18:00:00Z' },
  { id: 'u06', name: 'Arjun Patel', email: 'arjun.patel@health.gov.in', role: 'Health Worker', status: 'disabled', lastLogin: '2026-08-15T14:00:00Z' },
];

export const currentUser: User = users[0];

function genTrend(days: number, base: number, vol: number, seed: number): number[] {
  const r = seedRandom(seed);
  return Array.from({ length: days }, (_, i) => {
    const trend = Math.sin(i / 3) * vol * 0.5;
    const noise = (r() - 0.5) * vol;
    return Math.max(0, Math.round(base + trend + noise));
  });
}

export function getTrendData(villageId: string, days: number): TrendPoint[] {
  const seed = villageId.charCodeAt(2) * 100 + days;
  const cases = genTrend(days, 15, 12, seed);
  const risk = genTrend(days, 55, 30, seed + 1);
  const ph = genTrend(days, 7, 1.5, seed + 2);
  const turb = genTrend(days, 4, 3, seed + 3);
  const tds = genTrend(days, 400, 200, seed + 4);
  const temp = genTrend(days, 27, 4, seed + 5);
  const points: TrendPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(2026, 7, 20 - days + i + 1);
    points.push({
      date: d.toISOString().slice(0, 10),
      cases: cases[i],
      riskScore: Math.min(100, Math.max(0, risk[i])),
      ph: +(ph[i] / 10 + 5.5).toFixed(1),
      turbidity: +(turb[i] / 10 + 1).toFixed(1),
      tds: tds[i] + 100,
      temperature: +(temp[i] / 10 + 22).toFixed(1),
    });
  }
  return points;
}

export const dashboardStats = {
  totalVillages: villages.length,
  totalCases: villages.reduce((s, v) => s + v.suspectedCases, 0),
  highRiskVillages: villages.filter((v) => v.riskLevel === 'high').length,
  criticalRiskVillages: villages.filter((v) => v.riskLevel === 'critical').length,
  mediumRiskVillages: villages.filter((v) => v.riskLevel === 'medium').length,
  lowRiskVillages: villages.filter((v) => v.riskLevel === 'low').length,
};
