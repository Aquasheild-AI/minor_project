import type { RiskLevel } from '@/types';

export const riskConfig: Record<RiskLevel, { label: string; color: string; bg: string; text: string; hex: string }> = {
  low: { label: 'Safe', color: 'green', bg: 'bg-risk-low-bg', text: 'text-risk-low', hex: '#16a34a' },
  medium: { label: 'Medium', color: 'amber', bg: 'bg-risk-medium-bg', text: 'text-risk-medium', hex: '#d97706' },
  high: { label: 'High', color: 'orange', bg: 'bg-risk-high-bg', text: 'text-risk-high', hex: '#ea580c' },
  critical: { label: 'Critical', color: 'red', bg: 'bg-risk-critical-bg', text: 'text-risk-critical', hex: '#dc2626' },
};

export interface HealthRiskFactors {
  diseaseCategory?: string;
  disease_type?: string;
  suspectedCases?: number;
  suspected_cases?: number;
  symptoms?: string[];
  ageGroup?: string;
  age?: number;
  severity?: string;
  risk_level?: string;
  riskLevel?: string;
}

export function evaluateHealthRiskLevel(record: HealthRiskFactors): RiskLevel {
  let score = 0;

  // 1. Disease Pathogen Risk
  const disease = String(record.diseaseCategory || record.disease_type || '').toUpperCase();
  if (disease.includes('CHOLERA')) {
    score += 35;
  } else if (disease.includes('TYPHOID')) {
    score += 25;
  } else if (disease.includes('HEPATITIS')) {
    score += 20;
  } else if (disease.includes('DYSENTERY')) {
    score += 18;
  } else if (disease.includes('DIARRHEA') || disease.includes('GASTROENTERITIS')) {
    score += 10;
  } else if (disease) {
    score += 5;
  }

  // 2. Case Volume & Cluster Scale
  const cases = Number(record.suspectedCases ?? record.suspected_cases ?? 1);
  if (cases >= 25) {
    score += 45;
  } else if (cases >= 10) {
    score += 30;
  } else if (cases >= 5) {
    score += 20;
  } else if (cases >= 3) {
    score += 12;
  } else if (cases === 2) {
    score += 5;
  } else {
    score += 0;
  }

  // 3. Danger Symptoms
  const symptoms = (Array.isArray(record.symptoms) ? record.symptoms : []).map((s) => String(s).toLowerCase());
  if (symptoms.some((s) => s.includes('dehydration'))) score += 15;
  if (symptoms.some((s) => s.includes('vomit'))) score += 8;
  if (symptoms.some((s) => s.includes('fever'))) score += 6;
  if (symptoms.some((s) => s.includes('blood') || s.includes('bloody') || s.includes('dysentery'))) score += 15;
  if (symptoms.some((s) => s.includes('shock') || s.includes('unconscious') || s.includes('icu'))) score += 25;
  if (symptoms.some((s) => s.includes('pain') || s.includes('cramp') || s.includes('abdominal'))) score += 4;
  if (symptoms.some((s) => s.includes('headache'))) score += 2;

  // 4. Age Vulnerability
  const ageGroup = String(record.ageGroup || '');
  const age = Number(record.age ?? (ageGroup === '0-5' ? 3 : ageGroup === '6-12' ? 9 : ageGroup === '60+' ? 65 : 25));
  if (age <= 5 || ageGroup === '0-5' || ageGroup.toLowerCase().includes('under 5')) {
    score += 15;
  } else if (age >= 60 || ageGroup === '60+' || ageGroup === '65+') {
    score += 12;
  } else if (age <= 12 || ageGroup === '6-12' || ageGroup === '5-14') {
    score += 6;
  }

  // 5. Explicit Severity Floor from Authority
  const sev = String(record.severity || '').toUpperCase();
  if (sev === 'CRITICAL') score = Math.max(score, 75);
  else if (sev === 'SEVERE') score = Math.max(score, 50);

  // Fallback to explicit risk_level if neither disease nor symptoms are present
  if (!disease && symptoms.length === 0 && record.risk_level) {
    const raw = String(record.risk_level).toLowerCase();
    if (raw === 'critical') return 'critical';
    if (raw === 'high') return 'high';
    if (raw === 'medium') return 'medium';
    if (raw === 'low' || raw === 'safe') return 'low';
  }

  // 6. Classification: Critical (>=70), High (>=45), Medium (>=20), Safe (<20)
  if (score >= 70) return 'critical';
  if (score >= 45) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}

export function riskFromScore(score: number): RiskLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

export function timeAgo(iso: string): string {
  if (!iso) return 'Recently';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return 'Recently';
  const now = Date.now();
  const diff = Math.floor((now - then) / 1000);

  // If time is slightly in the future due to client/server clock skew or just created
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} days ago`;
  return formatDate(iso);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function phStatus(ph: number): { label: string; status: 'safe' | 'warn' | 'bad' } {
  if (ph < 6.5) return { label: 'Below preferred range', status: 'warn' };
  if (ph > 8.5) return { label: 'Above preferred range', status: 'warn' };
  if (ph < 6.5 || ph > 8.5) return { label: 'Out of range', status: 'bad' };
  return { label: 'Within range', status: 'safe' };
}

export function tdsStatus(tds: number): { label: string; status: 'safe' | 'warn' | 'bad' } {
  if (tds > 500) return { label: 'Elevated', status: 'warn' };
  if (tds > 1000) return { label: 'Unsafe', status: 'bad' };
  return { label: 'Normal', status: 'safe' };
}

export function turbidityStatus(t: number): { label: string; status: 'safe' | 'warn' | 'bad' } {
  if (t > 5) return { label: 'High', status: 'bad' };
  if (t > 3) return { label: 'Moderate', status: 'warn' };
  return { label: 'Normal', status: 'safe' };
}
