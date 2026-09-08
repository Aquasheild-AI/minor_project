import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  Droplets,
  Map as MapIcon,
  Bell,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { LoadingState } from '@/components/ui/States';
import { communityApi } from '@/services/communityApi';
import { communityUser, communityAlerts } from '@/data/communityData';
import { riskConfig, timeAgo } from '@/utils/risk';
import type { Village } from '@/types';

export function CommunityHome() {
  const navigate = useNavigate();
  const [village, setVillage] = useState<Village | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    communityApi.getUserVillage().then((v) => {
      setVillage(v);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingState message="Loading..." />;
  if (!village) return null;

  const cfg = riskConfig[village.riskLevel];
  const showBanner = village.riskLevel === 'high' || village.riskLevel === 'critical';
  const villageAlert = communityAlerts.find((a) => a.villageId === village.id && a.status === 'active');

  return (
    <div className="mx-auto max-w-4xl">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Hello, {communityUser.name.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-slate-500">Stay informed about the health and water conditions in your village.</p>
      </div>

      {/* Village selector */}
      <div className="mb-6 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{village.name} Village</p>
          <p className="text-xs text-slate-500">District: {village.district}</p>
        </div>
        <button onClick={() => navigate('/community/profile')} className="btn-secondary text-xs">
          Change Village
        </button>
      </div>

      {/* Alert Banner */}
      {showBanner && villageAlert && (
        <div
          className="mb-6 flex items-center justify-between rounded-xl border-l-4 p-4"
          style={{ backgroundColor: cfg.hex + '10', borderLeftColor: cfg.hex }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: cfg.hex + '20' }}>
              <AlertTriangle className="h-5 w-5" style={{ color: cfg.hex }} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {village.riskLevel === 'critical' ? 'Critical Risk Alert' : 'High Risk Alert'}
              </p>
              <p className="text-xs text-slate-600">
                Your village is currently classified as {cfg.label} Risk. Detected {timeAgo(villageAlert.detectedAt)}.
              </p>
            </div>
          </div>
          <Link to="/community/alerts" className="btn-primary text-xs">
            View Alert
          </Link>
        </div>
      )}

      {/* Current Risk Card */}
      <div className="card mb-6 overflow-hidden">
        <div className="p-6">
          <p className="text-sm font-medium text-slate-500">Current Village Risk</p>
          <div className="mt-4 flex items-center gap-6">
            <div className="relative h-28 w-28 flex-shrink-0">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke={cfg.hex}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(village.riskScore / 100) * 314} 314`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900">{village.riskScore}%</span>
                <span className="text-xs text-slate-500">Risk Score</span>
              </div>
            </div>
            <div>
              <RiskBadge level={village.riskLevel} />
              <p className="mt-2 text-sm text-slate-600">
                {village.riskLevel === 'low' && 'Current monitoring data indicates a low estimated disease risk.'}
                {village.riskLevel === 'medium' && 'Monitoring indicates increased risk compared with normal conditions.'}
                {village.riskLevel === 'high' && 'Your village is currently being monitored at a high risk level.'}
                {village.riskLevel === 'critical' && 'Your village is currently classified as Critical Risk based on available surveillance data.'}
              </p>
              <p className="mt-2 text-xs text-slate-400">Updated {timeAgo(village.lastUpdated)}</p>
            </div>
          </div>

          {/* Risk level bar */}
          <div className="mt-5">
            <div className="flex h-2.5 overflow-hidden rounded-full">
              <div className={`flex-1 ${village.riskLevel === 'low' ? 'bg-risk-low' : 'bg-slate-100'}`} />
              <div className={`flex-1 ${village.riskLevel === 'medium' ? 'bg-risk-medium' : 'bg-slate-100'}`} />
              <div className={`flex-1 ${village.riskLevel === 'high' ? 'bg-risk-high' : 'bg-slate-100'}`} />
              <div className={`flex-1 ${village.riskLevel === 'critical' ? 'bg-risk-critical' : 'bg-slate-100'}`} />
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-slate-400">
              <span>Low</span><span>Medium</span><span>High</span><span>Critical</span>
            </div>
          </div>

          <p className="mt-4 flex items-start gap-1.5 text-xs text-slate-400">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            Risk level is based on recent health reports, water-quality observations and other available data. This is not a medical diagnosis.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Link to="/community/report" className="card card-hover flex flex-col items-center gap-2 p-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
              <HeartPulse className="h-6 w-6 text-primary-600" />
            </div>
            <p className="text-sm font-semibold text-slate-900">Report Health Issue</p>
            <p className="text-xs text-slate-500">Report symptoms or concerns</p>
          </Link>
          <Link to="/community/water-quality" className="card card-hover flex flex-col items-center gap-2 p-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
              <Droplets className="h-6 w-6 text-primary-600" />
            </div>
            <p className="text-sm font-semibold text-slate-900">Check Water Quality</p>
            <p className="text-xs text-slate-500">View recent water data</p>
          </Link>
          <Link to="/community/risk-map" className="card card-hover flex flex-col items-center gap-2 p-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
              <MapIcon className="h-6 w-6 text-primary-600" />
            </div>
            <p className="text-sm font-semibold text-slate-900">View Risk Map</p>
            <p className="text-xs text-slate-500">See risk levels nearby</p>
          </Link>
          <Link to="/community/alerts" className="card card-hover flex flex-col items-center gap-2 p-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-risk-critical-bg">
              <Bell className="h-6 w-6 text-risk-critical" />
            </div>
            <p className="text-sm font-semibold text-slate-900">View Alerts</p>
            <p className="text-xs text-slate-500">Check active warnings</p>
          </Link>
        </div>
      </div>

      {/* Risk Factors */}
      <div className="card mb-6 p-5">
        <h3 className="mb-1 text-sm font-semibold text-slate-900">Why is the risk {cfg.label.toLowerCase()}?</h3>
        <p className="mb-4 text-xs text-slate-500">These are the main factors contributing to the current risk level.</p>
        <div className="space-y-3">
          <FactorItem icon={TrendingUp} label="Increasing Health Reports" detail="More suspected cases have recently been reported." />
          <FactorItem icon={Droplets} label="Elevated Turbidity" detail="Recent water-quality observations show elevated turbidity." />
          <FactorItem icon={Droplets} label="High TDS" detail="Recent TDS readings are elevated." />
        </div>
      </div>

      {/* Recent Alert Preview */}
      {villageAlert && (
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Latest Alert</h3>
            <Link to="/community/alerts" className="text-xs font-medium text-primary-600 hover:underline">View all</Link>
          </div>
          <div
            className="flex items-center gap-3 rounded-lg border-l-4 p-3"
            style={{ backgroundColor: riskConfig[villageAlert.severity].hex + '10', borderLeftColor: riskConfig[villageAlert.severity].hex }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: riskConfig[villageAlert.severity].hex + '20' }}>
              <Bell className="h-4 w-4" style={{ color: riskConfig[villageAlert.severity].hex }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <RiskBadge level={villageAlert.severity} />
                <span className="text-xs text-slate-400">{timeAgo(villageAlert.detectedAt)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-700">{villageAlert.message}</p>
            </div>
            <Link to="/community/alerts" className="text-xs font-medium text-primary-600 hover:underline">
              Details <ArrowRight className="ml-0.5 inline h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function FactorItem({ icon: Icon, label, detail }: { icon: React.ElementType; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
