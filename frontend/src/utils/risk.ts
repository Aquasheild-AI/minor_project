import type { RiskLevel } from '@/types';

export const riskConfig: Record<RiskLevel, { label: string; color: string; bg: string; text: string; hex: string }> = {
  low: { label: 'Low', color: 'green', bg: 'bg-risk-low-bg', text: 'text-risk-low', hex: '#16a34a' },
  medium: { label: 'Medium', color: 'amber', bg: 'bg-risk-medium-bg', text: 'text-risk-medium', hex: '#d97706' },
  high: { label: 'High', color: 'orange', bg: 'bg-risk-high-bg', text: 'text-risk-high', hex: '#ea580c' },
  critical: { label: 'Critical', color: 'red', bg: 'bg-risk-critical-bg', text: 'text-risk-critical', hex: '#dc2626' },
};

export function riskFromScore(score: number): RiskLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

export function timeAgo(iso: string): string {
  const now = new Date('2026-08-20T10:00:00Z').getTime();
  const then = new Date(iso).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)} days ago`;
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
