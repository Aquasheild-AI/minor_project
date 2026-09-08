import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Shield, Droplets, HeartPulse, Info, CheckCircle2 } from 'lucide-react';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { communityApi } from '@/services/communityApi';
import { riskConfig, timeAgo } from '@/utils/risk';
import type { CommunityAlert } from '@/data/communityData';

export function CommunityAlertDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [alert, setAlert] = useState<CommunityAlert | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    communityApi.getAlert(id!).then((a) => {
      setAlert(a || null);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <LoadingState />;

  if (!alert) {
    return (
      <div className="card">
        <EmptyState icon={AlertTriangle} title="Alert Not Found" message="This alert may have been removed or is no longer available." />
      </div>
    );
  }

  const cfg = riskConfig[alert.severity];

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => navigate('/community/alerts')} className="btn-secondary mb-4 text-sm">
        <ArrowLeft className="h-4 w-4" /> Back to Alerts
      </button>

      {/* Alert Header */}
      <div className="card mb-6 overflow-hidden" style={{ borderLeft: `4px solid ${cfg.hex}` }}>
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: cfg.hex + '20' }}
            >
              <AlertTriangle className="h-6 w-6" style={{ color: cfg.hex }} />
            </div>
            <div>
              <RiskBadge level={alert.severity} />
              <p className="mt-1 text-sm font-semibold text-slate-900">{alert.villageName}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <InfoItem label="Village" value={alert.villageName} />
            <InfoItem label="Risk Status" value={`${alert.riskScore}%`} />
            <InfoItem label="Detected" value={timeAgo(alert.detectedAt)} />
          </div>

          <p className="mt-4 text-sm text-slate-600">{alert.message}</p>
        </div>
      </div>

      {/* Why this alert was generated */}
      <div className="card mb-6 p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Why This Alert Was Generated</h3>
        <div className="space-y-3">
          {alert.factors.map((factor, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <Info className="h-4 w-4 text-slate-500" />
              </div>
              <p className="text-sm text-slate-600">{factor}</p>
            </div>
          ))}
        </div>
      </div>

      {/* What the community can do */}
      <div className="card mb-6 p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">What the Community Can Do</h3>
        <div className="space-y-3">
          {alert.guidance.map((g, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg bg-primary-50/50 p-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-risk-low" />
              <p className="text-sm text-slate-700">{g}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 flex items-start gap-1.5 text-xs text-slate-400">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          This guidance is general public-health information. It does not constitute medical advice, diagnosis, or treatment recommendations.
        </p>
      </div>

      {/* Quick links */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button onClick={() => navigate('/community/risk')} className="btn-secondary flex-1">
          <Shield className="h-4 w-4" /> View Risk Status
        </button>
        <button onClick={() => navigate('/community/water-quality')} className="btn-secondary flex-1">
          <Droplets className="h-4 w-4" /> Water Quality
        </button>
        <button onClick={() => navigate('/community/report')} className="btn-primary flex-1">
          <HeartPulse className="h-4 w-4" /> Report Issue
        </button>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
