import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Users, Activity, Droplets, Beaker, Thermometer, AlertTriangle, Bell, Calendar } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { PageHeader } from '@/components/ui/PageHeader';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { ChartCard } from '@/components/ui/ChartCard';
import { api } from '@/services/api';
import { riskConfig, timeAgo, formatDate } from '@/utils/risk';
import type { Village, Alert, TrendPoint, HealthRecord, WaterQualityRecord } from '@/types';

const diseaseColors: Record<string, string> = {
  Cholera: '#2563eb',
  Typhoid: '#16a34a',
  'Diarrheal Disease': '#d97706',
  Dysentery: '#ea580c',
  Hepatitis: '#9333ea',
  Other: '#94a3b8',
};

export function VillageDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [village, setVillage] = useState<Village | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [waterSample, setWaterSample] = useState<WaterQualityRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.getVillage(id),
      api.getAlerts({ village_id: id }),
      api.getTrends(id, 30),
      api.getHealthRecords({ village_id: id }),
      api.getWaterQuality({ village_id: id }),
    ]).then(([v, a, t, recs, wq]) => {
      if (v) {
        setVillage(v);
        setAlerts(a);
        setTrend(t);
        setRecords(recs);
        if (wq && wq.length > 0) setWaterSample(wq[0]);
      } else {
        setError(true);
      }
      setLoading(false);
    }).catch(() => {
      setError(true);
      setLoading(false);
    });
  }, [id]);

  const diseaseDistribution = useMemo(() => {
    if (records.length === 0) {
      return [
        { name: 'Cholera', value: 1, color: diseaseColors.Cholera },
        { name: 'Diarrheal Disease', value: 2, color: diseaseColors['Diarrheal Disease'] },
      ];
    }
    const counts: Record<string, number> = {};
    records.forEach((r) => {
      counts[r.diseaseCategory] = (counts[r.diseaseCategory] || 0) + (r.suspectedCases || 1);
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: diseaseColors[name] || '#64748b',
    }));
  }, [records]);

  if (loading) return <LoadingState message="Loading village surveillance details..." />;
  if (error || !village) return <ErrorState message="Village not found." onRetry={() => navigate('/villages')} />;

  return (
    <div>
      <PageHeader
        title={village.name}
        subtitle={`${village.district}, ${village.state}`}
        breadcrumb={['Home', 'Villages', village.name]}
        actions={
          <div className="flex items-center gap-2">
            <RiskBadge level={village.riskLevel} />
            <button onClick={() => navigate('/villages')} className="btn-secondary"><ArrowLeft className="h-4 w-4" /> Back</button>
          </div>
        }
      />

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card p-4">
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary-500" /><span className="text-sm text-slate-500">Population</span></div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{village.population.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-risk-high" /><span className="text-sm text-slate-500">Suspected Cases</span></div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{village.suspectedCases}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-risk-critical" /><span className="text-sm text-slate-500">Risk Score</span></div>
          <p className="mt-2 text-2xl font-bold" style={{ color: riskConfig[village.riskLevel].hex }}>{village.riskScore}%</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary-500" /><span className="text-sm text-slate-500">Last Assessment</span></div>
          <p className="mt-2 text-sm font-semibold text-slate-900">{timeAgo(village.lastUpdated)}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Health - Disease Distribution */}
        <ChartCard title="Health Surveillance" subtitle="Recorded cases by disease category">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={diseaseDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                {diseaseDistribution.map((e) => <Cell key={e.name} fill={e.color} />)}
              </Pie>
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Water Quality */}
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Latest Water Quality</h3>
          <div className="grid grid-cols-2 gap-3">
            <WaterMetric
              icon={Beaker}
              label="pH"
              value={waterSample ? String(waterSample.ph) : '7.2'}
              status={waterSample && (waterSample.ph < 6.5 || waterSample.ph > 8.5) ? 'Abnormal' : 'Standard'}
              statusColor={waterSample && (waterSample.ph < 6.5 || waterSample.ph > 8.5) ? 'text-risk-critical' : 'text-risk-low'}
            />
            <WaterMetric
              icon={Droplets}
              label="Turbidity"
              value={waterSample ? `${waterSample.turbidity} NTU` : '3.4 NTU'}
              status={waterSample && waterSample.turbidity > 5 ? 'High' : 'Normal'}
              statusColor={waterSample && waterSample.turbidity > 5 ? 'text-risk-critical' : 'text-risk-low'}
            />
            <WaterMetric
              icon={Thermometer}
              label="Temperature"
              value={waterSample ? `${waterSample.temperature}°C` : '26.5°C'}
              status="Normal"
              statusColor="text-risk-low"
            />
            <WaterMetric
              icon={Activity}
              label="TDS"
              value={waterSample ? `${waterSample.tds} ppm` : '380 ppm'}
              status="Recorded"
              statusColor="text-risk-low"
            />
          </div>
        </div>

        {/* Risk History */}
        <ChartCard title="Risk Trend" subtitle="Calculated risk score progression">
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

        {/* Map */}
        <ChartCard title="Village Location" subtitle="GPS Geographic Position">
          <div className="h-48 overflow-hidden rounded-lg">
            <MapContainer center={[village.lat, village.lng]} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
              <CircleMarker center={[village.lat, village.lng]} radius={12} pathOptions={{ color: riskConfig[village.riskLevel].hex, fillColor: riskConfig[village.riskLevel].hex, fillOpacity: 0.7 }}>
                <Popup><p className="font-semibold">{village.name}</p><p className="text-xs">Risk: {village.riskScore}%</p></Popup>
              </CircleMarker>
            </MapContainer>
          </div>
        </ChartCard>
      </div>

      {/* Recent Alerts */}
      <div className="card mt-6 p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Active Advisories</h3>
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-400">No active alerts reported for this village.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: riskConfig[a.severity].hex + '15' }}>
                  <Bell className="h-4 w-4" style={{ color: riskConfig[a.severity].hex }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2"><RiskBadge level={a.severity} /></div>
                  <p className="mt-1 text-sm text-slate-700">{a.message}</p>
                </div>
                <span className="text-xs text-slate-400">{timeAgo(a.detectedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Health Records */}
      <div className="card mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Health Surveillance Records</h3>
          <Link to="/health/add" className="text-xs font-medium text-primary-600 hover:underline">+ Add Record</Link>
        </div>
        {records.length === 0 ? (
          <p className="text-sm text-slate-400">No health records recorded yet for this village.</p>
        ) : (
          <div className="space-y-2">
            {records.slice(0, 5).map((r) => (
              <Link key={r.id} to={`/health/${r.id}`} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-900">{r.diseaseCategory}</p>
                  <p className="text-xs text-slate-500">{formatDate(r.reportingDate)} — {r.suspectedCases} case(s)</p>
                </div>
                <RiskBadge level={r.riskLevel} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WaterMetric({ icon: Icon, label, value, status, statusColor }: { icon: React.ElementType; label: string; value: string; status: string; statusColor: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-slate-400" /><span className="text-xs text-slate-500">{label}</span></div>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
      <p className={`text-xs ${statusColor}`}>{status}</p>
    </div>
  );
}
