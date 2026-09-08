import { useState, useEffect } from 'react';
import { TrendingUp, Activity, Droplets } from 'lucide-react';
import { ChartCard } from '@/components/ui/ChartCard';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { communityApi } from '@/services/communityApi';
import type { TrendPoint } from '@/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const tabs = [
  { key: 'ph', label: 'pH' },
  { key: 'turbidity', label: 'Turbidity' },
  { key: 'tds', label: 'TDS' },
  { key: 'temperature', label: 'Temperature' },
];

export function CommunityTrends() {
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [activeTab, setActiveTab] = useState('ph');

  useEffect(() => {
    setLoading(true);
    communityApi.getTrends(period).then((t) => {
      setTrend(t);
      setLoading(false);
    });
  }, [period]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Community Health Trends</h1>
      <p className="mb-6 text-sm text-slate-500">Track health issues, risk levels, and water quality over time.</p>

      {/* Period selector */}
      <div className="mb-4 flex gap-2">
        {[
          { label: '7 days', value: 7 },
          { label: '30 days', value: 30 },
          { label: '3 months', value: 90 },
        ].map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              period === p.value ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : trend.length === 0 ? (
        <div className="card">
          <EmptyState icon={TrendingUp} title="No Trend Data" message="Trend data is not available for this period." />
        </div>
      ) : (
        <>
          {/* Reported Health Issues */}
          <ChartCard title="Reported Health Issues" subtitle="Number of reported cases over time" className="mb-6">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.75rem' }} />
                <Line type="monotone" dataKey="cases" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Risk Trend */}
          <ChartCard title="Risk Trend" subtitle="Risk score over time" className="mb-6">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.75rem' }} />
                <Line type="monotone" dataKey="riskScore" stroke="#ea580c" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Water Quality Trends */}
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Droplets className="h-4 w-4 text-primary-600" />
              <h3 className="text-sm font-semibold text-slate-900">Water Quality</h3>
            </div>

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

            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.75rem' }} />
                <Line type="monotone" dataKey={activeTab} stroke="#0891b2" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
