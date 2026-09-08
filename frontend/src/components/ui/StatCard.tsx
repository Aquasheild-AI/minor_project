import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  trendNote?: string;
  iconColor?: string;
  iconBg?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendDirection = 'neutral',
  trendNote,
  iconColor = 'text-primary-600',
  iconBg = 'bg-primary-50',
}: StatCardProps) {
  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
      {(trend || trendNote) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 font-semibold ${
                trendDirection === 'up'
                  ? 'text-risk-critical'
                  : trendDirection === 'down'
                  ? 'text-risk-low'
                  : 'text-slate-500'
              }`}
            >
              {trendDirection === 'up' && <TrendingUp className="h-3 w-3" />}
              {trendDirection === 'down' && <TrendingDown className="h-3 w-3" />}
              {trend}
            </span>
          )}
          {trendNote && <span className="text-slate-400">{trendNote}</span>}
        </div>
      )}
    </div>
  );
}
