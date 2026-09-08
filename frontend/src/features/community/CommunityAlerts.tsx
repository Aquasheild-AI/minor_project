import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ArrowRight, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { communityApi } from '@/services/communityApi';
import { riskConfig, timeAgo } from '@/utils/risk';
import type { CommunityAlert } from '@/data/communityData';

const alertTypeConfig: Record<string, { label: string; variant: 'critical' | 'high' | 'medium' | 'info' }> = {
  critical: { label: 'Critical Alert', variant: 'critical' },
  high: { label: 'High Alert', variant: 'high' },
  medium: { label: 'Medium Alert', variant: 'medium' },
  information: { label: 'Information', variant: 'info' },
};

export function CommunityAlerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<CommunityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    communityApi.getAlerts().then((a) => {
      setAlerts(a);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingState />;

  const active = alerts.filter((a) => a.status === 'active');
  const resolved = alerts.filter((a) => a.status !== 'active');

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Community Alerts</h1>
      <p className="mb-6 text-sm text-slate-500">Stay informed about warnings and health advisories for your area.</p>

      {/* Active Alerts */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Active Alerts</h3>
        {active.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={CheckCircle2}
              title="No Active Alerts"
              message="No active warnings have been issued for your village."
            />
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((alert) => {
              const cfg = riskConfig[alert.severity];
              const typeCfg = alertTypeConfig[alert.type];
              return (
                <div
                  key={alert.id}
                  className="card overflow-hidden"
                  style={{ borderLeft: `4px solid ${cfg.hex}` }}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: cfg.hex + '20' }}
                        >
                          {alert.severity === 'critical' || alert.severity === 'high' ? (
                            <AlertTriangle className="h-5 w-5" style={{ color: cfg.hex }} />
                          ) : (
                            <Bell className="h-5 w-5" style={{ color: cfg.hex }} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <RiskBadge level={alert.severity} />
                            <span className="text-xs text-slate-400">{timeAgo(alert.detectedAt)}</span>
                          </div>
                          <p className="mt-1.5 text-sm font-semibold text-slate-900">{alert.message}</p>
                          <p className="text-xs text-slate-500">{alert.villageName} · Risk Score: {alert.riskScore}%</p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/community/alerts/${alert.id}`)}
                        className="btn-secondary text-xs whitespace-nowrap"
                      >
                        View Details <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolved / Past Alerts */}
      {resolved.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Past Alerts</h3>
          <div className="space-y-3">
            {resolved.map((alert) => {
              const cfg = riskConfig[alert.severity];
              return (
                <div key={alert.id} className="card p-4 opacity-75">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                      <Info className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <RiskBadge level={alert.severity} />
                        <span className="text-xs text-slate-400">{timeAgo(alert.detectedAt)}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{alert.message}</p>
                    </div>
                    <button
                      onClick={() => navigate(`/community/alerts/${alert.id}`)}
                      className="text-xs font-medium text-primary-600 hover:underline"
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
