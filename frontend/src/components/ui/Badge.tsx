import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'low' | 'medium' | 'high' | 'critical' | 'info' | 'neutral';
  className?: string;
}

const variants: Record<string, string> = {
  default: 'bg-slate-100 text-slate-700',
  neutral: 'bg-slate-100 text-slate-600',
  info: 'bg-primary-50 text-primary-700',
  low: 'bg-risk-low-bg text-risk-low',
  medium: 'bg-risk-medium-bg text-risk-medium',
  high: 'bg-risk-high-bg text-risk-high',
  critical: 'bg-risk-critical-bg text-risk-critical',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return <span className={`badge ${variants[variant]} ${className}`}>{children}</span>;
}
