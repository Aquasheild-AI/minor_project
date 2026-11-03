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
  // Evaluated strictly on the basis of number of suspected cases:
  // - <= 1 case  : Safe ('low')
  // - 2 cases    : Medium ('medium')
  // - 3 - 9 cases: High ('high')
  // - >= 10 cases: Critical ('critical')
  const cases = Number(record.suspectedCases ?? record.suspected_cases ?? 1);

  if (cases >= 10) return 'critical';
  if (cases >= 3) return 'high';
  if (cases >= 2) return 'medium';

  // Explicit authority clinical severity override (if clinically flagged as SEVERE/CRITICAL)
  const sev = String(record.severity || '').toUpperCase();
  if (sev === 'CRITICAL') return 'critical';
  if (sev === 'SEVERE') return 'high';

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
