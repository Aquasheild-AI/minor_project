import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Droplets, Info, ArrowRight } from 'lucide-react';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { LoadingState } from '@/components/ui/States';
import { communityApi } from '@/services/communityApi';
import { riskConfig, timeAgo } from '@/utils/risk';
import type { Village } from '@/types';

export function CommunityRiskStatus() {
  const [village, setVillage] = useState<Village | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    communityApi.getUserVillage().then((v) => {
      setVillage(v);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingState />;
  if (!village) return null;

  const cfg = riskConfig[village.riskLevel];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Risk Status</h1>

      {/* Large Risk Card */}
      <div className="card mb-6 overflow-hidden">
        <div className="p-6 text-center">
          <p className="text-sm font-medium text-slate-500">Current Village Risk</p>
          <div className="mt-4 flex justify-center">
            <div className="relative h-36 w-36">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke={cfg.hex}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(village.riskScore / 100) * 314} 314`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-900">{village.riskScore}%</span>
                <span className="text-xs text-slate-500">Risk Score</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <RiskBadge level={village.riskLevel} />
          </div>
          <p className="mt-3 text-sm text-slate-600 max-w-md mx-auto">
            {village.riskLevel === 'low' && 'Current monitoring data indicates a low estimated disease risk.'}
            {village.riskLevel === 'medium' && 'Monitoring indicates increased risk compared with normal conditions.'}
            {village.riskLevel === 'high' && 'Your village is currently being monitored at a high risk level.'}
            {village.riskLevel === 'critical' && 'Your village is currently classified as Critical Risk based on available surveillance data.'}
          </p>
          <p className="mt-2 text-xs text-slate-400">Updated {timeAgo(village.lastUpdated)}</p>
        </div>

        {/* Risk level bar */}
        <div className="border-t border-slate-100 px-6 py-4">
          <div className="flex h-3 overflow-hidden rounded-full">
            <div className={`flex-1 ${village.riskLevel === 'low' ? 'bg-risk-low' : 'bg-slate-100'}`} />
            <div className={`flex-1 ${village.riskLevel === 'medium' ? 'bg-risk-medium' : 'bg-slate-100'}`} />
            <div className={`flex-1 ${village.riskLevel === 'high' ? 'bg-risk-high' : 'bg-slate-100'}`} />
            <div className={`flex-1 ${village.riskLevel === 'critical' ? 'bg-risk-critical' : 'bg-slate-100'}`} />
          </div>
          <div className="mt-1.5 flex justify-between text-xs font-medium text-slate-500">
            <span className={village.riskLevel === 'low' ? 'text-risk-low' : ''}>Low</span>
            <span className={village.riskLevel === 'medium' ? 'text-risk-medium' : ''}>Medium</span>
            <span className={village.riskLevel === 'high' ? 'text-risk-high' : ''}>High</span>
            <span className={village.riskLevel === 'critical' ? 'text-risk-critical' : ''}>Critical</span>
          </div>
        </div>
      </div>

      {/* Why is the risk high? */}
      <div className="card mb-6 p-5">
        <h3 className="mb-1 text-sm font-semibold text-slate-900">Why is the risk {cfg.label.toLowerCase()}?</h3>
        <p className="mb-4 text-xs text-slate-500">These are the main factors contributing to the current risk level, explained in simple terms.</p>
        <div className="space-y-3">
          <FactorCard icon={TrendingUp} label="Increasing Health Reports" detail="More suspected cases have recently been reported in your village." />
          <FactorCard icon={Droplets} label="Elevated Turbidity" detail="Recent water-quality observations show the water is cloudier than normal." />
          <FactorCard icon={Droplets} label="High TDS" detail="Recent readings show elevated levels of dissolved substances in the water." />
        </div>
      </div>

      {/* Info */}
      <div className="card p-5">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-500" />
          <div>
            <p className="text-sm font-medium text-slate-900">About Risk Levels</p>
            <p className="mt-1 text-xs text-slate-500">
              Risk levels are estimated based on recent health reports, water-quality observations, and other available data.
              This is not a medical diagnosis. Always follow official local health advisories.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Link to="/community/water-quality" className="btn-secondary flex-1">View Water Quality</Link>
        <Link to="/community/alerts" className="btn-primary flex-1">View Alerts <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </div>
  );
}

function FactorCard({ icon: Icon, label, detail }: { icon: React.ElementType; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 p-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
        <Icon className="h-5 w-5 text-slate-500" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
