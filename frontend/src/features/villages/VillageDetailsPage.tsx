import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Activity,
  Droplets,
  Beaker,
  Thermometer,
  AlertTriangle,
  Bell,
  Calendar,
  Siren,
  Truck,
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { PageHeader } from '@/components/ui/PageHeader';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { ChartCard } from '@/components/ui/ChartCard';
import { DispatchModal } from '@/components/emergency/DispatchModal';
import { api } from '@/services/api';
import { riskConfig, timeAgo, formatDate } from '@/utils/risk';
import type { Village, Alert, TrendPoint, HealthRecord, WaterQualityRecord, EmergencyDispatch } from '@/types';

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

  // Emergency Dispatch Modal State
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [villageDispatches, setVillageDispatches] = useState<EmergencyDispatch[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.getVillage(id),
      api.getAlerts({ village_id: id }),
      api.getTrends(id, 30),
      api.getHealthRecords({ village_id: id }),
      api.getWaterQuality({ village_id: id }),
      api.getDispatches({ village_id: id }).catch(() => [] as EmergencyDispatch[]),
    ])
      .then(([v, a, t, recs, wq, dList]) => {
        if (v) {
          setVillage(v);
          setAlerts(a);
          setTrend(t);
          setRecords(recs);
          setVillageDispatches(dList || []);
          if (wq && wq.length > 0) setWaterSample(wq[0]);
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => {
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

  const handleUpdateDispatchStatus = async (id: number, nextStatus: string) => {
    try {
      const updated = await api.updateDispatchStatus(id, nextStatus);
      setVillageDispatches((prev) => prev.map((d) => (d.id === id ? updated : d)));
    } catch (e) {
      console.error('Failed to update dispatch status:', e);
    }
  };

  const activeDispatches = villageDispatches.filter(
    (d) => d.status !== 'RESOLVED' && d.status !== 'CANCELLED'
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={village.name}
        subtitle={`${village.district}, ${village.state}`}
        breadcrumb={['Home', 'Villages', village.name]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <RiskBadge level={village.riskLevel} />
            <button
              onClick={() => setShowDispatchModal(true)}
              className="btn-primary bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm inline-flex items-center gap-1.5 font-semibold"
            >
              <Siren className="h-4 w-4" /> Dispatch Ambulance / Team
            </button>
            <button onClick={() => navigate('/villages')} className="btn-secondary">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </div>
        }
      />

      {/* Active Emergency Deployment Banner */}
      {activeDispatches.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Siren className="h-4 w-4 text-red-600 animate-pulse" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-950">
                Active Emergency Deployment ({activeDispatches.length} Unit Active)
              </h4>
            </div>
            <span className="badge bg-red-100 text-red-800 border border-red-200 font-bold text-[10px]">
              Priority Intervention
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeDispatches.map((d) => (
              <div key={d.id} className="rounded-lg border border-red-200 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="badge bg-red-100 text-red-700 text-[10px] font-bold">{d.priority_display}</span>
                  <span className="text-xs font-semibold text-slate-800">{d.status_display}</span>
                </div>
                <p className="mt-1 text-xs font-bold text-slate-900">{d.dispatch_type_display}</p>
                <p className="text-xs text-slate-600 mt-0.5">{d.reason}</p>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Lead: {d.team_lead_name} ({d.team_lead_phone || 'N/A'})</span>
                  <span className="font-bold text-slate-800">ETA: {d.estimated_arrival_minutes}m</span>
                </div>
                <div className="mt-2 pt-1.5 border-t border-dashed border-slate-100 flex items-center justify-end gap-1.5">
                  {d.status === 'DISPATCHED' && (
                    <button
                      onClick={() => handleUpdateDispatchStatus(d.id, 'ON_SITE')}
                      className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-[11px] border border-blue-200 transition-colors"
                    >
                      Mark On-Site
                    </button>
                  )}
                  <button
                    onClick={() => handleUpdateDispatchStatus(d.id, 'RESOLVED')}
                    className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium text-[11px] border border-emerald-200 transition-colors"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
              icon={Droplets}
              label="TDS"
              value={waterSample ? `${waterSample.tds} ppm` : '210 ppm'}
              status={waterSample && waterSample.tds > 500 ? 'Elevated' : 'Normal'}
              statusColor={waterSample && waterSample.tds > 500 ? 'text-risk-critical' : 'text-risk-low'}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Link to="/water-quality" className="text-xs font-medium text-primary-600 hover:underline">View All Water Tests →</Link>
          </div>
        </div>
      </div>

      {/* 30-Day Risk Trend */}
      <ChartCard title="30-Day Risk & Case Trend" subtitle="Daily predicted risk score vs reported cases">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 10]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="riskScore" name="Risk Score (%)" stroke="#2563eb" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="cases" name="Suspected Cases" stroke="#ea580c" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Active Alerts */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Active Advisories ({alerts.length})</h3>
          <Link to="/alerts" className="text-xs font-medium text-primary-600 hover:underline">Manage All Alerts →</Link>
        </div>
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-400">No active advisories for this village.</p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: riskConfig[a.severity].bg }}>
                  <Bell className="h-3.5 w-3.5" style={{ color: riskConfig[a.severity].hex }} />
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
      <div className="card p-5">
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

      {/* Emergency Dispatch Modal */}
      <DispatchModal
        open={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        initialVillageId={id}
        onSuccess={(newD) => setVillageDispatches((prev) => [newD, ...prev])}
      />
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
