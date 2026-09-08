import { useState, useEffect } from 'react';
import { Beaker, Droplets, Thermometer, Activity, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ChartCard } from '@/components/ui/ChartCard';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { communityApi } from '@/services/communityApi';
import { waterQualityExplanations } from '@/data/communityData';
import { timeAgo } from '@/utils/risk';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TrendPoint } from '@/types';

const tabs = [
  { key: 'ph', label: 'pH' },
  { key: 'turbidity', label: 'Turbidity' },
  { key: 'tds', label: 'TDS' },
  { key: 'temperature', label: 'Temperature' },
];

const iconMap: Record<string, React.ElementType> = {
  beaker: Beaker,
  droplets: Droplets,
  activity: Activity,
  thermometer: Thermometer,
};

export function CommunityWaterQuality() {
  const [wq, setWq] = useState<typeof import('@/data/communityData').communityWaterQuality | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [activeTab, setActiveTab] = useState('ph');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([communityApi.getWaterQuality(), communityApi.getTrends(period)]).then(([w, t]) => {
      setWq(w);
      setTrend(t);
      setLoading(false);
    });
  }, [period]);

  if (loading) return <LoadingState />;

  const phStatus = wq!.ph < 6.5 || wq!.ph > 8.5 ? { label: 'Needs Attention', variant: 'medium' as const } : { label: 'Normal', variant: 'low' as const };
  const turbStatus = wq!.turbidity > 5 ? { label: 'Elevated', variant: 'critical' as const } : wq!.turbidity > 3 ? { label: 'Moderate', variant: 'medium' as const } : { label: 'Normal', variant: 'low' as const };
  const tdsStatus = wq!.tds > 500 ? { label: 'Elevated', variant: 'medium' as const } : { label: 'Normal', variant: 'low' as const };
  const tempStatus = { label: 'Normal', variant: 'low' as const };

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Water Quality</h1>
      <p className="mb-6 text-sm text-slate-500">View recent water-quality observations for your village.</p>

      {/* Water Quality Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <WQCard icon={Beaker} label="pH" value={String(wq!.ph)} status={phStatus.label} variant={phStatus.variant} />
        <WQCard icon={Droplets} label="Turbidity" value={`${wq!.turbidity} NTU`} status={turbStatus.label} variant={turbStatus.variant} />
        <WQCard icon={Activity} label="TDS" value={`${wq!.tds} ppm`} status={tdsStatus.label} variant={tdsStatus.variant} />
        <WQCard icon={Thermometer} label="Temperature" value={`${wq!.temperature}°C`} status={tempStatus.label} variant={tempStatus.variant} />
      </div>

      <p className="mt-3 text-xs text-slate-400">Last updated {timeAgo(wq!.lastUpdated)}</p>

      {/* Water Quality Trends */}
      <div className="card mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Water Quality Trends</h3>
          <select value={period} onChange={(e) => setPeriod(Number(e.target.value))} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>3 months</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {trend.length === 0 ? (
          <EmptyState icon={Droplets} title="No Water Quality Data" message="Water-quality observations are not available for this period." />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.75rem' }} />
              <Line type="monotone" dataKey={activeTab} stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* What do these values mean? */}
      <div className="card mt-6 p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">What do these values mean?</h3>
        <div className="space-y-2">
          {waterQualityExplanations.map((item) => {
            const Icon = iconMap[item.icon];
            const isOpen = expanded === item.param;
            return (
              <div key={item.param} className="rounded-lg border border-slate-100">
                <button
                  onClick={() => setExpanded(isOpen ? null : item.param)}
                  className="flex w-full items-center justify-between p-3 text-left hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-900">{item.param}</span>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>
                {isOpen && (
                  <div className="px-3 pb-3">
                    <p className="text-xs text-slate-500">{item.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Info */}
      <div className="card mt-6 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500" />
          <p className="text-xs text-slate-500">
            These readings are for informational purposes only. A single parameter does not determine whether water is medically safe.
            Always follow official local health advisories regarding water safety.
          </p>
        </div>
      </div>
    </div>
  );
}

function WQCard({ icon: Icon, label, value, status, variant }: { icon: React.ElementType; label: string; value: string; status: string; variant: 'low' | 'medium' | 'critical' }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <div className="mt-1.5"><Badge variant={variant}>{status}</Badge></div>
    </div>
  );
}
