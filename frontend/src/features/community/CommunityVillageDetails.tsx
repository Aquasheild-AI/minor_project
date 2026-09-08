import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Droplets, Activity, TrendingUp, MapPin } from 'lucide-react';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { ChartCard } from '@/components/ui/ChartCard';
import { communityApi } from '@/services/communityApi';
import { riskConfig, timeAgo } from '@/utils/risk';
import type { Village, TrendPoint } from '@/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export function CommunityVillageDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [village, setVillage] = useState<Village | null | undefined>(undefined);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([communityApi.getVillage(id!), communityApi.getTrends(30)]).then(([v, t]) => {
      setVillage(v || null);
      setTrend(t);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <LoadingState />;

  if (!village) {
    return (
      <div className="card">
        <EmptyState icon={MapPin} title="Village Not Found" message="This village may not be available." />
      </div>
    );
  }

  const cfg = riskConfig[village.riskLevel];

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={() => navigate('/community/risk-map')} className="btn-secondary mb-4 text-sm">
        <ArrowLeft className="h-4 w-4" /> Back to Map
      </button>

      {/* Header */}
      <div className="card mb-6 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{village.name} Village</h1>
            <p className="text-sm text-slate-500">{village.district}, {village.state}</p>
          </div>
          <RiskBadge level={village.riskLevel} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <InfoItem label="Risk Score" value={`${village.riskScore}%`} />
          <InfoItem label="Recent Cases" value={String(village.suspectedCases)} />
          <InfoItem label="Last Updated" value={timeAgo(village.lastUpdated)} />
        </div>
      </div>

      {/* Health Status */}
      <div className="card mb-6 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary-600" />
          <h3 className="text-sm font-semibold text-slate-900">Health Status</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Recent reported cases</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{village.suspectedCases}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Case trend</p>
            <p className="mt-1 text-sm font-bold text-risk-critical">Increasing</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Risk trend</p>
            <p className="mt-1 text-sm font-bold" style={{ color: cfg.hex }}>{cfg.label}</p>
          </div>
        </div>
      </div>

      {/* Water Status */}
      <div className="card mb-6 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Droplets className="h-4 w-4 text-primary-600" />
          <h3 className="text-sm font-semibold text-slate-900">Water Status</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <WaterItem label="pH" value="6.1" status="Needs Attention" statusColor="text-risk-medium" />
          <WaterItem label="Turbidity" value="10.2 NTU" status="Elevated" statusColor="text-risk-critical" />
          <WaterItem label="TDS" value="820 ppm" status="Elevated" statusColor="text-risk-medium" />
          <WaterItem label="Temperature" value="29°C" status="Normal" statusColor="text-risk-low" />
        </div>
        <Link to="/community/water-quality" className="btn-secondary mt-4 w-full text-sm">
          View Full Water Quality
        </Link>
      </div>

      {/* Risk History */}
      <ChartCard title="Risk History" subtitle="Risk score trend over the last 30 days" className="mb-6">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={trend}>
            <defs>
              <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.75rem' }} />
            <Area type="monotone" dataKey="riskScore" stroke="#ea580c" strokeWidth={2} fill="url(#riskGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Quick actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link to="/community/risk" className="btn-secondary flex-1">View Risk Status</Link>
        <Link to="/community/report" className="btn-primary flex-1">Report Health Issue</Link>
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

function WaterItem({ label, value, status, statusColor }: { label: string; value: string; status: string; statusColor: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
      <p className={`text-xs ${statusColor}`}>{status}</p>
    </div>
  );
}
