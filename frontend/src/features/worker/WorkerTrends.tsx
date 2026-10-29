import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { PageHeader } from '@/components/ui/PageHeader';
import { ChartCard } from '@/components/ui/ChartCard';
import { LoadingState } from '@/components/ui/States';
import { workerApi } from '@/services/workerApi';
import { riskConfig } from '@/utils/risk';
import type { TrendPoint, Village } from '@/types';

export function WorkerTrends() {
  const [villageList, setVillageList] = useState<Village[]>([]);
  const [villageId, setVillageId] = useState('');
  const [period, setPeriod] = useState(30);
  const [selectedDisease, setSelectedDisease] = useState('All Monitored Diseases');
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    workerApi.getVillages().then((v) => {
      setVillageList(v);
      if (v.length > 0) {
        setVillageId(v[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!villageId) return;
    setLoading(true);
    workerApi.getTrends(villageId, period, selectedDisease).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [villageId, period, selectedDisease]);

  return (
    <div>
      <PageHeader title="Health & Risk Trends" subtitle="Analyze disease patterns, risk progression, and water quality trends over time." breadcrumb={['Home', 'Trends']} />

      <div className="card mb-6 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Assigned Village</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select value={villageId} onChange={(e) => setVillageId(e.target.value)} className="input pl-10">
                {villageList.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.district})</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Disease Category</label>
            <select
              value={selectedDisease}
              onChange={(e) => setSelectedDisease(e.target.value)}
              className="input"
            >
              <option value="All Monitored Diseases">All Monitored Diseases</option>
              <option value="Cholera">Cholera</option>
              <option value="Typhoid">Typhoid</option>
              <option value="Dysentery">Dysentery</option>
              <option value="Hepatitis">Hepatitis</option>
              <option value="Diarrheal Disease">Diarrheal Disease</option>
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
        <LoadingState message="Loading historical trends for your assigned village..." />
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

          <ChartCard title="Risk Level Progression" subtitle="Risk score progression over time">
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
          </div>
        </div>
      )}
    </div>
  );
}
