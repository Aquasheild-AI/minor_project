import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Users,
  AlertTriangle,
  ShieldAlert,
  Droplets,
  Thermometer,
  Beaker,
  Activity,
  ArrowRight,
  Bell,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { ChartCard } from '@/components/ui/ChartCard';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { LoadingState } from '@/components/ui/States';
import { api } from '@/services/api';
import { villages, alerts } from '@/data/mockData';
import { riskConfig, timeAgo } from '@/utils/risk';
import type { Village, Alert } from '@/types';

const riskDistribution = [
  { name: 'Low', value: villages.filter((v) => v.riskLevel === 'low').length, color: riskConfig.low.hex },
  { name: 'Medium', value: villages.filter((v) => v.riskLevel === 'medium').length, color: riskConfig.medium.hex },
  { name: 'High', value: villages.filter((v) => v.riskLevel === 'high').length, color: riskConfig.high.hex },
  { name: 'Critical', value: villages.filter((v) => v.riskLevel === 'critical').length, color: riskConfig.critical.hex },
];

const trendData = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 6, 22 + i);
  return {
    date: d.toISOString().slice(5, 10),
    cases: Math.floor(20 + Math.sin(i / 4) * 15 + Math.random() * 10),
  };
});

const waterStats = {
  ph: 7.2,
  turbidity: 3.4,
  tds: 380,
  temperature: 27.5,
};

export function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [villageList, setVillageList] = useState<Village[]>([]);
  const [alertList, setAlertList] = useState<Alert[]>([]);
  const [trendRange, setTrendRange] = useState<'7' | '30' | '90'>('30');

  useEffect(() => {
    Promise.all([api.getVillages(), api.getAlerts()]).then(([v, a]) => {
      setVillageList(v);
      setAlertList(a);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingState message="Loading dashboard..." />;

  const filteredTrend = trendRange === '7' ? trendData.slice(-7) : trendRange === '30' ? trendData : trendData;

  return (
    <div>
      <PageHeader
        title="Disease Surveillance Dashboard"
        subtitle="Monitor community health, water quality and disease risk across monitored villages."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Villages" value={villageList.length} icon={MapPin} trend="+4.2%" trendDirection="up" trendNote="vs last month" iconColor="text-primary-600" iconBg="bg-primary-50" />
        <StatCard label="Total Reported Cases" value={villageList.reduce((s, v) => s + v.suspectedCases, 0)} icon={Users} trend="+12.5%" trendDirection="up" trendNote="vs last week" iconColor="text-primary-600" iconBg="bg-primary-50" />
        <StatCard label="High Risk Villages" value={villageList.filter((v) => v.riskLevel === 'high').length} icon={AlertTriangle} trend="+2 from last week" trendDirection="up" trendNote="" iconColor="text-risk-high" iconBg="bg-risk-high-bg" />
        <StatCard label="Critical Risk Villages" value={villageList.filter((v) => v.riskLevel === 'critical').length} icon={ShieldAlert} trend="Requires attention" trendDirection="up" trendNote="" iconColor="text-risk-critical" iconBg="bg-risk-critical-bg" />
      </div>

      {/* Charts row */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Risk Distribution */}
        <ChartCard title="Risk Distribution" subtitle="Villages by current risk level">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={riskDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {riskDistribution.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Disease Trend */}
        <ChartCard
          title="Disease Trend"
          subtitle="Suspected cases over time"
          className="lg:col-span-2"
          actions={
            <select
              value={trendRange}
              onChange={(e) => setTrendRange(e.target.value as '7' | '30' | '90')}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
            </select>
          }
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={filteredTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.75rem' }} />
              <Line type="monotone" dataKey="cases" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Water Quality Overview */}
      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Water Quality Overview</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="card p-4">
            <div className="flex items-center gap-2">
              <Beaker className="h-4 w-4 text-primary-500" />
              <span className="text-sm text-slate-500">Average pH</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{waterStats.ph}</p>
            <span className="badge mt-1 bg-risk-low-bg text-risk-low">Within range</span>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-primary-500" />
              <span className="text-sm text-slate-500">Average Turbidity</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{waterStats.turbidity} <span className="text-sm font-normal text-slate-400">NTU</span></p>
            <span className="badge mt-1 bg-risk-medium-bg text-risk-medium">Moderate</span>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary-500" />
              <span className="text-sm text-slate-500">Average TDS</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{waterStats.tds} <span className="text-sm font-normal text-slate-400">ppm</span></p>
            <span className="badge mt-1 bg-risk-low-bg text-risk-low">Normal</span>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-primary-500" />
              <span className="text-sm text-slate-500">Average Temp</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{waterStats.temperature} <span className="text-sm font-normal text-slate-400">°C</span></p>
            <span className="badge mt-1 bg-risk-low-bg text-risk-low">Normal</span>
          </div>
        </div>
      </div>

      {/* GIS Preview + Recent Alerts */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="GIS Risk Preview" subtitle="Village locations with risk markers" className="lg:col-span-2">
          <div className="h-80 overflow-hidden rounded-lg">
            <MapContainer center={[25.32, 83.0]} zoom={10} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
              {villageList.map((v) => (
                <CircleMarker
                  key={v.id}
                  center={[v.lat, v.lng]}
                  radius={8}
                  pathOptions={{ color: riskConfig[v.riskLevel].hex, fillColor: riskConfig[v.riskLevel].hex, fillOpacity: 0.7 }}
                >
                  <Popup>
                    <div className="space-y-1">
                      <p className="font-semibold">{v.name}</p>
                      <p className="text-xs text-slate-500">{v.district}, {v.state}</p>
                      <p className="text-xs">Risk Score: <span className="font-semibold">{v.riskScore}%</span></p>
                      <p className="text-xs">Cases: {v.suspectedCases}</p>
                      <Link to={`/villages/${v.id}`} className="text-xs font-medium text-primary-600 hover:underline">View Details</Link>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
          <Link to="/risk-map" className="btn-secondary mt-3 w-full">
            Open Full Risk Map <ArrowRight className="h-4 w-4" />
          </Link>
        </ChartCard>

        {/* Recent Alerts */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Recent Alerts</h3>
            <Link to="/alerts" className="text-xs font-medium text-primary-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {alertList.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: riskConfig[alert.severity].hex + '15' }}>
                  <Bell className="h-4 w-4" style={{ color: riskConfig[alert.severity].hex }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <RiskBadge level={alert.severity} />
                    <span className="text-xs text-slate-400">{timeAgo(alert.detectedAt)}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-800">{alert.villageName}</p>
                  <p className="text-xs text-slate-500">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
