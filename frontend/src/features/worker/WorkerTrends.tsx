import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { PageHeader } from '@/components/ui/PageHeader';
import { ChartCard } from '@/components/ui/ChartCard';
import { LoadingState } from '@/components/ui/States';
import { workerApi } from '@/services/workerApi';
import { assignedVillages } from '@/data/workerData';
import { riskConfig } from '@/utils/risk';
import type { TrendPoint } from '@/types';

export function WorkerTrends() {
  const [villageId, setVillageId] = useState('wv01');
  const [period, setPeriod] = useState(30);
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    workerApi.getTrends(villageId, period).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [villageId, period]);

  return (
    <div>
      <PageHeader title="Health & Risk Trends" subtitle="Analyze disease patterns, risk progression, and water quality trends over time." breadcrumb={['Home', 'Trends']} />

      <div className="card mb-6 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Village</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select value={villageId} onChange={(e) => setVillageId(e.target.value)} className="input pl-10">
                {assignedVillages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Disease Category</label>
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
            <label className="label">Time Range</label>
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
          <ChartCard title="Disease Trend" subtitle={`Suspected cases over the last ${period} days`}>
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

          <ChartCard title="Risk Trend" subtitle="Risk score over time">
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
        </div>
      )}
    </div>
  );
}
