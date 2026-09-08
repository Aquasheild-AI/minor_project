import type { Village, Alert, Notification, TrendPoint, RiskLevel, Symptom } from '@/types';

export interface CommunityUser {
  id: string;
  name: string;
  email: string;
  villageId: string;
  villageName: string;
  district: string;
  accountType: string;
  language: 'English' | 'Hindi';
}

export const communityUser: CommunityUser = {
  id: 'cu01',
  name: 'Abhinav Kumar',
  email: 'abhinav.kumar@gmail.com',
  villageId: 'cv01',
  villageName: 'Rampur',
  district: 'Varanasi',
  accountType: 'Community User',
  language: 'English',
};

// Villages visible to community users (nearby villages)
export const communityVillages: Village[] = [
  { id: 'cv01', name: 'Rampur', district: 'Varanasi', state: 'Uttar Pradesh', population: 8420, lat: 25.3176, lng: 82.9739, riskLevel: 'critical', riskScore: 91, suspectedCases: 47, waterStatus: 'unsafe', lastUpdated: '2026-08-20T08:30:00Z' },
  { id: 'cv02', name: 'Lakshmi Nagar', district: 'Varanasi', state: 'Uttar Pradesh', population: 6210, lat: 25.3356, lng: 83.0076, riskLevel: 'high', riskScore: 78, suspectedCases: 31, waterStatus: 'unsafe', lastUpdated: '2026-08-20T07:45:00Z' },
  { id: 'cv03', name: 'Shivpur', district: 'Varanasi', state: 'Uttar Pradesh', population: 5340, lat: 25.3501, lng: 83.0123, riskLevel: 'high', riskScore: 72, suspectedCases: 24, waterStatus: 'moderate', lastUpdated: '2026-08-20T06:20:00Z' },
  { id: 'cv04', name: 'Bhulanpur', district: 'Varanasi', state: 'Uttar Pradesh', population: 4870, lat: 25.3010, lng: 82.9550, riskLevel: 'medium', riskScore: 54, suspectedCases: 12, waterStatus: 'moderate', lastUpdated: '2026-08-20T05:10:00Z' },
  { id: 'cv05', name: 'Harhua', district: 'Varanasi', state: 'Uttar Pradesh', population: 7200, lat: 25.2800, lng: 82.9400, riskLevel: 'medium', riskScore: 48, suspectedCases: 9, waterStatus: 'moderate', lastUpdated: '2026-08-19T22:00:00Z' },
  { id: 'cv06', name: 'Kashi Vidyapeeth', district: 'Varanasi', state: 'Uttar Pradesh', population: 5600, lat: 25.2650, lng: 82.9900, riskLevel: 'low', riskScore: 22, suspectedCases: 3, waterStatus: 'safe', lastUpdated: '2026-08-19T20:30:00Z' },
  { id: 'cv07', name: 'Cholapur', district: 'Varanasi', state: 'Uttar Pradesh', population: 6800, lat: 25.2400, lng: 83.0200, riskLevel: 'low', riskScore: 18, suspectedCases: 2, waterStatus: 'safe', lastUpdated: '2026-08-19T18:00:00Z' },
  { id: 'cv08', name: 'Sevapuri', district: 'Varanasi', state: 'Uttar Pradesh', population: 5100, lat: 25.2200, lng: 82.8500, riskLevel: 'medium', riskScore: 51, suspectedCases: 11, waterStatus: 'moderate', lastUpdated: '2026-08-19T16:45:00Z' },
  { id: 'cv09', name: 'Araziline', district: 'Varanasi', state: 'Uttar Pradesh', population: 4900, lat: 25.2600, lng: 82.8700, riskLevel: 'high', riskScore: 69, suspectedCases: 19, waterStatus: 'unsafe', lastUpdated: '2026-08-19T15:20:00Z' },
  { id: 'cv10', name: 'Pindra', district: 'Varanasi', state: 'Uttar Pradesh', population: 6300, lat: 25.3800, lng: 82.9200, riskLevel: 'low', riskScore: 25, suspectedCases: 4, waterStatus: 'safe', lastUpdated: '2026-08-19T14:00:00Z' },
];

export interface CommunityAlert extends Alert {
  type: 'critical' | 'high' | 'medium' | 'information';
  guidance: string[];
}

export const communityAlerts: CommunityAlert[] = [
  {
    id: 'ca01',
    severity: 'critical',
    type: 'critical',
    villageId: 'cv01',
    villageName: 'Rampur',
    riskScore: 91,
    message: 'Disease risk in your area has reached a critical level.',
    factors: ['Recent health reports have increased', 'Recent water-quality observations show elevated values', 'Overall estimated risk has increased'],
    detectedAt: '2026-08-20T08:18:00Z',
    status: 'active',
    read: false,
    guidance: [
      'Follow official local health advisories.',
      'Check official water-quality updates.',
      'Report suspected health issues through this portal.',
    ],
  },
  {
    id: 'ca02',
    severity: 'high',
    type: 'high',
    villageId: 'cv02',
    villageName: 'Lakshmi Nagar',
    riskScore: 78,
    message: 'High disease-risk level detected in a nearby village.',
    factors: ['Elevated turbidity', 'Increasing suspected cases'],
    detectedAt: '2026-08-20T07:38:00Z',
    status: 'active',
    read: false,
    guidance: [
      'Stay informed about nearby village conditions.',
      'Check water-quality updates regularly.',
    ],
  },
  {
    id: 'ca03',
    severity: 'medium',
    type: 'medium',
    villageId: 'cv04',
    villageName: 'Bhulanpur',
    riskScore: 54,
    message: 'Medium disease-risk level detected in a nearby village.',
    factors: ['Moderate turbidity', 'Seasonal case patterns'],
    detectedAt: '2026-08-19T22:00:00Z',
    status: 'active',
    read: true,
    guidance: [
      'Monitor local health updates.',
      'Practice good water safety habits.',
    ],
  },
  {
    id: 'ca04',
    severity: 'high',
    type: 'information',
    villageId: 'cv03',
    villageName: 'Shivpur',
    riskScore: 72,
    message: 'New health surveillance information is available for a nearby village.',
    factors: ['Updated surveillance data'],
    detectedAt: '2026-08-19T15:00:00Z',
    status: 'resolved',
    read: true,
    guidance: ['Review the latest community health information.'],
  },
];

export const communityNotifications: Notification[] = [
  { id: 'cn01', type: 'alert', severity: 'critical', message: 'Your village has entered the Critical risk category.', villageName: 'Rampur', time: '2026-08-20T08:18:00Z', read: false },
  { id: 'cn02', type: 'water', severity: 'info', message: 'New water-quality observations are available.', villageName: 'Rampur', time: '2026-08-20T07:00:00Z', read: false },
  { id: 'cn03', type: 'system', severity: 'info', message: 'New health surveillance information is available.', villageName: 'Rampur', time: '2026-08-20T04:00:00Z', read: false },
  { id: 'cn04', type: 'health', severity: 'info', message: 'Your health report has been reviewed.', villageName: 'Rampur', time: '2026-08-19T18:00:00Z', read: true },
];

export interface CommunityReport {
  id: string;
  date: string;
  villageName: string;
  symptoms: Symptom[];
  peopleAffected: string;
  ageGroup?: string;
  notes?: string;
  status: 'submitted' | 'under_review' | 'reviewed';
}

export const communityReports: CommunityReport[] = [
  { id: 'cr01', date: '2026-08-19', villageName: 'Rampur', symptoms: ['Fever', 'Diarrhea'], peopleAffected: '2-5', ageGroup: '5-14', status: 'reviewed' },
  { id: 'cr02', date: '2026-08-15', villageName: 'Rampur', symptoms: ['Vomiting', 'Abdominal Pain'], peopleAffected: '1', ageGroup: '31-50', status: 'under_review' },
  { id: 'cr03', date: '2026-08-10', villageName: 'Rampur', symptoms: ['Headache', 'Fever'], peopleAffected: '6-10', notes: 'Several families in the area affected.', status: 'reviewed' },
];

export const communityWaterQuality = {
  ph: 6.1,
  turbidity: 10.2,
  tds: 820,
  temperature: 29,
  lastUpdated: '2026-08-20T07:00:00Z',
};

export const communityRiskFactors = [
  { label: 'Increasing Health Reports', detail: 'More suspected cases have recently been reported.', icon: 'trending-up' },
  { label: 'Elevated Turbidity', detail: 'Recent water-quality observations show elevated turbidity.', icon: 'droplets' },
  { label: 'High TDS', detail: 'Recent TDS readings are elevated.', icon: 'beaker' },
];

function seedRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function genTrend(days: number, base: number, vol: number, seed: number): number[] {
  const r = seedRandom(seed);
  return Array.from({ length: days }, (_, i) => {
    const trend = Math.sin(i / 3) * vol * 0.5;
    const noise = (r() - 0.5) * vol;
    return Math.max(0, Math.round(base + trend + noise));
  });
}

export function getCommunityTrendData(days: number): TrendPoint[] {
  const seed = 99 + days;
  const cases = genTrend(days, 12, 10, seed);
  const risk = genTrend(days, 60, 25, seed + 1);
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

export const waterQualityExplanations = [
  { param: 'pH', icon: 'beaker', explanation: 'pH measures how acidic or basic the water is. Safe drinking water typically has a pH between 6.5 and 8.5.' },
  { param: 'Turbidity', icon: 'droplets', explanation: 'Turbidity measures how clear the water is. High turbidity means the water is cloudy and may contain particles.' },
  { param: 'TDS', icon: 'activity', explanation: 'TDS (Total Dissolved Solids) measures the amount of dissolved substances in water. High TDS can affect taste and safety.' },
  { param: 'Temperature', icon: 'thermometer', explanation: 'Water temperature can affect how bacteria and other organisms grow in water sources.' },
];
