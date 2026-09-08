import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Users, Activity, Droplets, Beaker, Thermometer, AlertTriangle, Bell, Calendar } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { PageHeader } from '@/components/ui/PageHeader';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { ChartCard } from '@/components/ui/ChartCard';
import { workerApi } from '@/services/workerApi';
import { workerAlerts, workerHealthRecords } from '@/data/workerData';
import { riskConfig, timeAgo, formatDate } from '@/utils/risk';
import type { Village, Alert, TrendPoint } from '@/types';

const diseaseDistribution = [
  { name: 'Cholera', value: 12, color: '#2563eb' },
  { name: 'Typhoid', value: 8, color: '#16a34a' },
  { name: 'Diarrheal', value: 15, color: '#d97706' },
  { name: 'Dysentery', value: 6, color: '#ea580c' },
  { name: 'Other', value: 4, color: '#94a3b8' },
];

export function WorkerVillageDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [village, setVillage] = useState<Village | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([workerApi.getVillage(id!), workerApi.getAlerts(), workerApi.getTrends(id!, 30)]).then(([v, a, t]) => {
      if (v) {
        setVillage(v);
        setAlerts(a.filter((al) => al.villageId === id));
        setTrend(t);
      } else {
        setError(true);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) return <LoadingState />;
  if (error || !village) return <ErrorState message="Village not found." onRetry={() => navigate('/worker/villages')} />;

  const villageRecords = workerHealthRecords.filter((r) => r.villageId === id);

  return (
    <div>
      <PageHeader
        title={village.name}
        subtitle={`${village.district}, ${village.state}`}
        breadcrumb={['Home', 'My Villages', village.name]}
        actions={
          <div className="flex items-center gap-2">
            <RiskBadge level={village.riskLevel} />
            <button onClick={() => navigate('/worker/villages')} className="btn-secondary"><ArrowLeft className="h-4 w-4" /> Back</button>
          </div>
        }
      />

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
          <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary-500" /><span className="text-sm text-slate-500">Last Report</span></div>
          <p className="mt-2 text-sm font-semibold text-slate-900">{timeAgo(village.lastUpdated)}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Health Data" subtitle="Disease distribution">
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

        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Water Quality</h3>
          <div className="grid grid-cols-2 gap-3">
            <WaterMetric icon={Beaker} label="pH" value="6.1" status="Below range" statusColor="text-risk-medium" />
            <WaterMetric icon={Droplets} label="Turbidity" value="6.2 NTU" status="High" statusColor="text-risk-critical" />
            <WaterMetric icon={Thermometer} label="Temperature" value="28.3°C" status="Normal" statusColor="text-risk-low" />
            <WaterMetric icon={Activity} label="TDS" value="620 ppm" status="Elevated" statusColor="text-risk-medium" />
          </div>
        </div>

        <ChartCard title="Risk History" subtitle="Risk score over last 30 days">
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

        <ChartCard title="Village Location" subtitle="Geographic position">
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
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Recent Alerts</h3>
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-400">No recent alerts for this village.</p>
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
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Recent Health Records</h3>
        {villageRecords.length === 0 ? (
          <p className="text-sm text-slate-400">No health records for this village.</p>
        ) : (
          <div className="space-y-2">
            {villageRecords.slice(0, 5).map((r) => (
              <Link key={r.id} to={`/worker/health/${r.id}`} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-900">{r.diseaseCategory}</p>
                  <p className="text-xs text-slate-500">{formatDate(r.reportingDate)} — {r.suspectedCases} cases</p>
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
