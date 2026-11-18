import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  FileText,
  AlertTriangle,
  ShieldAlert,
  Plus,
  Droplets,
  Map as MapIcon,
  Bell,
  ArrowRight,
  Stethoscope,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { ChartCard } from '@/components/ui/ChartCard';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/States';
import { workerApi } from '@/services/workerApi';
import { api } from '@/services/api';
import { riskConfig, timeAgo, formatDate } from '@/utils/risk';
import type { Village, Alert, HealthRecord, WaterQualityRecord, TrendPoint, Appointment } from '@/types';

const waterStatusVariant: Record<string, 'low' | 'medium' | 'critical'> = {
  safe: 'low',
  moderate: 'medium',
  unsafe: 'critical',
};

export function WorkerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [villages, setVillages] = useState<Village[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [waterSamples, setWaterSamples] = useState<WaterQualityRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);

  useEffect(() => {
    async function loadWorkerDashboard() {
      try {
        const [v, a, hr, wq, s, appts] = await Promise.all([
          workerApi.getAssignedVillages(),
          workerApi.getAlerts(),
          workerApi.getHealthRecords(),
          workerApi.getWaterQuality(),
          workerApi.getDashboardStats(),
          api.getAppointments().catch(() => [] as Appointment[]),
        ]);

        setVillages(v);
        setAlerts(a);
        setRecords(hr);
        setWaterSamples(wq);
        setStats(s);
        setAppointments(appts || []);

        if (v.length > 0) {
          const trends = await workerApi.getTrends(v[0].id, 14);
          setTrendData(trends);
        }
      } catch (err) {
        console.error('Failed to load worker dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadWorkerDashboard();
  }, []);

  const riskDistribution = useMemo(() => {
    return [
      { name: 'Low', value: villages.filter((v) => v.riskLevel === 'low').length, color: riskConfig.low.hex },
      { name: 'Medium', value: villages.filter((v) => v.riskLevel === 'medium').length, color: riskConfig.medium.hex },
      { name: 'High', value: villages.filter((v) => v.riskLevel === 'high').length, color: riskConfig.high.hex },
      { name: 'Critical', value: villages.filter((v) => v.riskLevel === 'critical').length, color: riskConfig.critical.hex },
    ];
  }, [villages]);

  if (loading) return <LoadingState message="Loading your assigned surveillance dashboard..." />;

  const highRiskVillages = villages.filter((v) => v.riskLevel === 'high' || v.riskLevel === 'critical' || v.riskLevel === 'medium');
  const recentReports = records.slice(0, 5);
  const recentWater = waterSamples.slice(0, 5);
  const activeAlerts = alerts.filter((a) => a.status !== 'resolved').slice(0, 4);

  const totalAssigned = villages.length;
  const newReportsCount = records.length;
  const highRiskCount = villages.filter((v) => v.riskLevel === 'high' || v.riskLevel === 'critical').length;
  const criticalAlertsCount = alerts.filter((a) => a.severity === 'critical' && a.status !== 'resolved').length;

  return (
    <div>
      <PageHeader
        title="Health Worker Dashboard"
        subtitle="Monitor assigned villages and respond to emerging health and water-quality risks."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div onClick={() => navigate('/worker/villages')} className="cursor-pointer">
          <StatCard label="Assigned Villages" value={totalAssigned} icon={MapPin} trendNote="Villages under surveillance" iconColor="text-primary-600" iconBg="bg-primary-50" />
        </div>
        <div onClick={() => navigate('/worker/health')} className="cursor-pointer">
          <StatCard label="Recorded Cases" value={newReportsCount} icon={FileText} trendNote="Under assigned jurisdiction" iconColor="text-primary-600" iconBg="bg-primary-50" />
        </div>
        <div onClick={() => navigate('/worker/villages')} className="cursor-pointer">
          <StatCard label="High Risk Villages" value={highRiskCount} icon={AlertTriangle} trendNote={highRiskCount > 0 ? 'Requires clinical attention' : 'All standard'} iconColor="text-risk-high" iconBg="bg-risk-high-bg" />
        </div>
        <div onClick={() => navigate('/worker/alerts')} className="cursor-pointer">
          <StatCard label="Critical Alerts" value={criticalAlertsCount} icon={ShieldAlert} trendNote={criticalAlertsCount > 0 ? 'Immediate review required' : 'No critical alerts'} iconColor="text-risk-critical" iconBg="bg-risk-critical-bg" />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Link to="/worker/health/add" className="card card-hover flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
              <Plus className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Add Health Record</p>
              <p className="text-xs text-slate-500">Record new cases</p>
            </div>
          </Link>
          <Link to="/worker/water-quality/add" className="card card-hover flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
              <Droplets className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Add Water Sample</p>
              <p className="text-xs text-slate-500">Log test results</p>
            </div>
          </Link>
          <Link to="/worker/risk-map" className="card card-hover flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
              <MapIcon className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">View Risk Map</p>
              <p className="text-xs text-slate-500">Assigned village map</p>
            </div>
          </Link>
          <Link to="/worker/alerts" className="card card-hover flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-risk-critical-bg">
              <Bell className="h-5 w-5 text-risk-critical" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">View Advisories</p>
              <p className="text-xs text-slate-500">Acknowledge & review</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Authority Appointed Doctor Consultations (Visible to Health Worker at all times) */}
      <div className="mt-6 rounded-xl border border-teal-200 bg-teal-50/60 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white shadow-2xs">
              <Stethoscope className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Authority Scheduled Clinical Consultations ({appointments.filter((a) => a.status === 'SCHEDULED').length} Active)
              </h3>
              <p className="text-xs text-slate-500">
                Official clinical appointments allocated by District Health Authority for village surveillance cases.
              </p>
            </div>
          </div>
          <Link
            to="/worker/reports"
            className="text-xs font-bold text-teal-700 hover:text-teal-800 hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Open Community Triage</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {appointments.filter((a) => a.status === 'SCHEDULED').length === 0 ? (
          <div className="rounded-lg border border-dashed border-teal-200 p-4 text-center text-xs text-slate-500 bg-white">
            No active doctor appointments currently pending in your assigned jurisdiction.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {appointments
              .filter((a) => a.status === 'SCHEDULED')
              .map((a) => (
                <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:shadow-xs transition-shadow">
                  <div className="flex items-start justify-between gap-1.5">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{a.patient_name}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {a.village_name} {a.district ? `(${a.district})` : ''}
                      </p>
                    </div>
                    <span className="rounded bg-teal-100 text-teal-800 px-1.5 py-0.5 text-[10px] font-extrabold uppercase">
                      {a.priority_display || a.priority}
                    </span>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs space-y-1">
                    <div className="font-semibold text-teal-800 truncate">
                      🩺 {a.doctor_name}
                    </div>
                    <div className="text-slate-600 text-[11px] truncate">
                      🏥 {a.facility_name}
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      📅 {a.appointment_date} · {a.time_slot}
                    </div>
                    {a.instructions && (
                      <div className="text-slate-600 bg-slate-50 p-1.5 rounded text-[11px] mt-1 border border-slate-100">
                        <strong>Directives:</strong> {a.instructions}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Villages Requiring Attention */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Assigned Villages Status</h3>
          <Link to="/worker/villages" className="text-xs font-medium text-primary-600 hover:underline">View all</Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {highRiskVillages.slice(0, 6).map((v) => (
            <div key={v.id} className="card card-hover p-4">
              <div className="flex items-center justify-between">
                <RiskBadge level={v.riskLevel} />
                <span className="text-xs text-slate-400">{timeAgo(v.lastUpdated)}</span>
              </div>
              <p className="mt-2 text-base font-bold text-slate-900">{v.name}</p>
              <p className="text-xs text-slate-500">{v.district}, {v.state}</p>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Risk Score</p>
                  <p className="text-lg font-bold" style={{ color: riskConfig[v.riskLevel].hex }}>{v.riskScore}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Cases</p>
                  <p className="text-lg font-bold text-slate-900">{v.suspectedCases}</p>
                </div>
              </div>
              <Link to={`/worker/villages/${v.id}`} className="btn-secondary mt-3 w-full text-xs">
                View Details <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Risk Distribution" subtitle="Your assigned villages by risk level">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={riskDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                {riskDistribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Surveillance Cases Trend" subtitle="Past 14 days" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.75rem' }} />
              <Line type="monotone" dataKey="cases" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Recent Reports + Water Quality */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent Health Reports */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Recent Health Reports</h3>
            <Link to="/worker/health" className="text-xs font-medium text-primary-600 hover:underline">View all</Link>
          </div>
          {recentReports.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">No health records recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {recentReports.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{r.villageName}</p>
                    <p className="text-xs text-slate-500">{r.diseaseCategory} — {r.suspectedCases} case(s)</p>
                    <p className="text-xs text-slate-400">{formatDate(r.reportingDate)}</p>
                  </div>
                  <RiskBadge level={r.riskLevel} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Water Quality */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Recent Water Quality Samples</h3>
            <Link to="/worker/water-quality" className="text-xs font-medium text-primary-600 hover:underline">View all</Link>
          </div>
          {recentWater.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">No water samples recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {recentWater.map((w) => (
                <div key={w.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                      <Droplets className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{w.villageName}</p>
                      <p className="text-xs text-slate-500">
                        pH {w.ph} · Turb {w.turbidity} NTU · TDS {w.tds} ppm
                      </p>
                    </div>
                  </div>
                  <Badge variant={waterStatusVariant[w.status] || 'low'}>{w.status.toUpperCase()}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Alerts */}
      <div className="card mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Active Advisories</h3>
          <Link to="/worker/alerts" className="text-xs font-medium text-primary-600 hover:underline">View all</Link>
        </div>
        <div className="space-y-3">
          {activeAlerts.length === 0 ? (
            <p className="text-sm text-slate-400">No active alerts for your assigned villages.</p>
          ) : (
            activeAlerts.map((alert) => (
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
                <Link to="/worker/alerts" className="flex items-center self-center text-xs font-medium text-primary-600 hover:underline">
                  Review <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
