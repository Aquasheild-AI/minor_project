import { useState, useEffect } from 'react';
import { TrendingUp, MapPin } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart, ComposedChart } from 'recharts';
import { PageHeader } from '@/components/ui/PageHeader';
import { ChartCard } from '@/components/ui/ChartCard';
import { LoadingState } from '@/components/ui/States';
import { api } from '@/services/api';
import { villages } from '@/data/mockData';
import { riskConfig } from '@/utils/risk';
import type { TrendPoint } from '@/types';

export function TrendsPage() {
  const [villageId, setVillageId] = useState('v01');
  const [period, setPeriod] = useState(30);
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareVillages, setCompareVillages] = useState<string[]>(['v01', 'v02', 'v03']);
  const [compareData, setCompareData] = useState<Record<string, TrendPoint[]>>({});

  useEffect(() => {
    setLoading(true);
    api.getTrends(villageId, period).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [villageId, period]);

  useEffect(() => {
    const fetches = compareVillages.map((id) => api.getTrends(id, 30).then((d) => [id, d] as const));
    Promise.all(fetches).then((entries) => {
      setCompareData(Object.fromEntries(entries));
    });
  }, [compareVillages]);

  const riskColors = [riskConfig.low.hex, riskConfig.medium.hex, riskConfig.high.hex, riskConfig.critical.hex];

  const mergedCompare = data.length > 0
    ? data.map((point, i) => {
        const row: Record<string, number | string> = { date: point.date };
        compareVillages.forEach((id) => {
          const v = villages.find((v) => v.id === id);
          row[v?.name || id] = compareData[id]?.[i]?.cases || 0;
        });
        return row;
      })
    : [];

  return (
    <div>
      <PageHeader title="Historical Trends" subtitle="Analyze disease patterns, risk progression, and water quality trends over time." breadcrumb={['Home', 'Historical Trends']} />

      {/* Filters */}
      <div className="card mb-6 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Village</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select value={villageId} onChange={(e) => setVillageId(e.target.value)} className="input pl-10">
                {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Disease</label>
            <select className="input">
              <option>All Diseases</option>
              <option>Cholera</option>
              <option>Typhoid</option>
              <option>Dysentery</option>
              <option>Hepatitis</option>
              <option>Diarrheal Disease</option>
            </select>
          </div>
          <div>
            <label className="label">Time Period</label>
            <select value={period} onChange={(e) => setPeriod(Number(e.target.value))} className="input">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 3 months</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <div className="space-y-6">
          {/* Disease Cases Trend */}
          <ChartCard title="Disease Cases Trend" subtitle={`Suspected cases over the last ${period} days`}>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="caseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.75rem' }} />
                <Area type="monotone" dataKey="cases" stroke="#2563eb" strokeWidth={2} fill="url(#caseGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Risk Level History */}
          <ChartCard title="Risk Level History" subtitle="Risk score progression over time">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.75rem' }} />
                <Line type="monotone" dataKey="riskScore" stroke="#ea580c" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 flex justify-center gap-4 text-xs">
              {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
                <div key={level} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: riskConfig[level].hex }} />
                  <span className="text-slate-500">{riskConfig[level].label}</span>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* Water Quality Trends */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="pH Trend" subtitle="Water pH levels over time">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[5, 9]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.75rem' }} />
                  <Line type="monotone" dataKey="ph" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Turbidity Trend" subtitle="Water turbidity (NTU) over time">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.75rem' }} />
                  <Line type="monotone" dataKey="turbidity" stroke="#d97706" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="TDS Trend" subtitle="Total dissolved solids (ppm) over time">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.75rem' }} />
                  <Line type="monotone" dataKey="tds" stroke="#16a34a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Temperature Trend" subtitle="Water temperature (°C) over time">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.75rem' }} />
                  <Line type="monotone" dataKey="temperature" stroke="#dc2626" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Comparison */}
          <ChartCard title="Village Comparison" subtitle="Compare disease cases across selected villages">
            <div className="mb-4 flex flex-wrap gap-2">
              {villages.slice(0, 6).map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setCompareVillages((prev) =>
                      prev.includes(v.id) ? prev.filter((id) => id !== v.id) : [...prev, v.id].slice(0, 4)
                    );
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    compareVillages.includes(v.id)
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: riskColors[i % 4] }} />
                  {v.name}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={mergedCompare}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.75rem' }} />
                <Legend />
                {compareVillages.map((id, i) => {
                  const v = villages.find((v) => v.id === id);
                  return (
                    <Line key={id} type="monotone" dataKey={v?.name || id} stroke={riskColors[i % 4]} strokeWidth={2} dot={false} />
                  );
                })}
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}
