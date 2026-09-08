import { useState, useEffect } from 'react';
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
  Activity,
  Beaker,
  Thermometer,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { ChartCard } from '@/components/ui/ChartCard';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/States';
import { workerApi } from '@/services/workerApi';
import { assignedVillages, workerHealthRecords, workerWaterQuality, workerAlerts, workerDashboardStats } from '@/data/workerData';
import { riskConfig, timeAgo, formatDate } from '@/utils/risk';
import type { Village, Alert } from '@/types';

const riskDistribution = [
  { name: 'Low', value: assignedVillages.filter((v) => v.riskLevel === 'low').length, color: riskConfig.low.hex },
  { name: 'Medium', value: assignedVillages.filter((v) => v.riskLevel === 'medium').length, color: riskConfig.medium.hex },
  { name: 'High', value: assignedVillages.filter((v) => v.riskLevel === 'high').length, color: riskConfig.high.hex },
  { name: 'Critical', value: assignedVillages.filter((v) => v.riskLevel === 'critical').length, color: riskConfig.critical.hex },
];

const trendData = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(2026, 7, 7 + i);
  return {
    date: d.toISOString().slice(5, 10),
    cases: Math.floor(15 + Math.sin(i / 3) * 10 + Math.random() * 8),
  };
});

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

  useEffect(() => {
    Promise.all([workerApi.getVillages(), workerApi.getAlerts()]).then(([v, a]) => {
      setVillages(v);
      setAlerts(a);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingState message="Loading your dashboard..." />;

  const highRiskVillages = villages.filter((v) => v.riskLevel === 'medium' || v.riskLevel === 'high' || v.riskLevel === 'critical');
  const recentReports = workerHealthRecords.slice(0, 5);
  const recentWater = workerWaterQuality.slice(0, 5);
  const activeAlerts = alerts.filter((a) => a.status !== 'resolved').slice(0, 4);

  return (
    <div>
      <PageHeader
        title="Health Worker Dashboard"
        subtitle="Monitor assigned villages and respond to emerging health and water-quality risks."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div onClick={() => navigate('/worker/villages')} className="cursor-pointer">
          <StatCard label="Assigned Villages" value={workerDashboardStats.assignedVillages} icon={MapPin} trendNote="Villages under monitoring" iconColor="text-primary-600" iconBg="bg-primary-50" />
        </div>
        <div onClick={() => navigate('/worker/health')} className="cursor-pointer">
          <StatCard label="New Reports" value={workerDashboardStats.newReports} icon={FileText} trendNote="This week" iconColor="text-primary-600" iconBg="bg-primary-50" />
        </div>
        <div onClick={() => navigate('/worker/villages')} className="cursor-pointer">
          <StatCard label="High Risk" value={workerDashboardStats.highRisk} icon={AlertTriangle} trendNote="Require attention" iconColor="text-risk-high" iconBg="bg-risk-high-bg" />
        </div>
        <div onClick={() => navigate('/worker/alerts')} className="cursor-pointer">
          <StatCard label="Critical Alerts" value={workerDashboardStats.criticalAlerts} icon={ShieldAlert} trendNote="Immediate review required" iconColor="text-risk-critical" iconBg="bg-risk-critical-bg" />
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
              <p className="text-sm font-semibold text-slate-900">Add Water Quality</p>
              <p className="text-xs text-slate-500">Record sample data</p>
            </div>
          </Link>
          <Link to="/worker/risk-map" className="card card-hover flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
              <MapIcon className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">View Risk Map</p>
              <p className="text-xs text-slate-500">See village locations</p>
            </div>
          </Link>
          <Link to="/worker/alerts" className="card card-hover flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-risk-critical-bg">
              <Bell className="h-5 w-5 text-risk-critical" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">View Alerts</p>
              <p className="text-xs text-slate-500">Check warnings</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Villages Requiring Attention */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Villages Requiring Attention</h3>
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
        <ChartCard title="Risk Distribution" subtitle="Your villages by risk level">
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

        <ChartCard title="Disease Cases Trend" subtitle="Last 14 days" className="lg:col-span-2">
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
          <div className="space-y-2">
            {recentReports.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-900">{r.villageName}</p>
                  <p className="text-xs text-slate-500">{r.diseaseCategory} — {r.suspectedCases} cases</p>
                  <p className="text-xs text-slate-400">{formatDate(r.reportingDate)}</p>
                </div>
                <RiskBadge level={r.riskLevel} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Water Quality */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Recent Water Quality</h3>
            <Link to="/worker/water-quality" className="text-xs font-medium text-primary-600 hover:underline">View all</Link>
          </div>
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
                      pH {w.ph} · Turb {w.turbidity} · TDS {w.tds}
                    </p>
                  </div>
                </div>
                <Badge variant={waterStatusVariant[w.status]}>{w.status.charAt(0).toUpperCase() + w.status.slice(1)}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      <div className="card mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Active Alerts</h3>
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
                  <p className="text-xs text-slate-500">{alert.message} Risk Score: {alert.riskScore}%</p>
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
