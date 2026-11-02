import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  Plus,
  Send,
  Siren,
  Truck,
  Check,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { DispatchModal } from '@/components/emergency/DispatchModal';
import { api } from '@/services/api';
import { riskConfig, timeAgo, formatDateTime } from '@/utils/risk';
import type { Alert, AlertStatus, Village, EmergencyDispatch } from '@/types';

const tabs: { key: 'all' | 'critical' | 'high' | 'medium' | 'resolved'; label: string }[] = [
  { key: 'all', label: 'All Active' },
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'resolved', label: 'Resolved' },
];

const statusConfig: Record<AlertStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  active: { label: 'Active', icon: AlertTriangle, color: 'text-risk-critical', bg: 'bg-risk-critical-bg' },
  under_review: { label: 'Under Review', icon: Clock, color: 'text-risk-medium', bg: 'bg-risk-medium-bg' },
  resolved: { label: 'Resolved', icon: CheckCircle2, color: 'text-risk-low', bg: 'bg-risk-low-bg' },
};

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [villageList, setVillageList] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selected, setSelected] = useState<Alert | null>(null);

  // New Alert Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    villageId: '',
    title: '',
    message: '',
    severity: 'HIGH',
    targetAudience: 'ALL',
    actionRequired: 'Boil water before consumption.',
  });

  // Emergency Dispatch Modal State
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchVillageId, setDispatchVillageId] = useState<string | number>('');
  const [dispatchReason, setDispatchReason] = useState<string>('');
  const [dispatches, setDispatches] = useState<EmergencyDispatch[]>([]);

  useEffect(() => {
    Promise.all([
      api.getAlerts(),
      api.getVillages(),
      api.getDispatches().catch(() => [] as EmergencyDispatch[]),
    ]).then(([a, v, d]) => {
      setAlerts(a);
      setVillageList(v);
      setDispatches(d || []);
      if (v.length > 0) {
        setCreateForm((prev) => ({ ...prev, villageId: v[0].id }));
      }
      setLoading(false);
    });
  }, []);

  const filtered = alerts.filter((a) => {
    if (activeTab === 'all') return a.status !== 'resolved';
    if (activeTab === 'resolved') return a.status === 'resolved';
    return a.severity === activeTab && a.status !== 'resolved';
  });

  const stats = {
    total: alerts.filter((a) => a.status !== 'resolved').length,
    critical: alerts.filter((a) => a.severity === 'critical' && a.status !== 'resolved').length,
    high: alerts.filter((a) => a.severity === 'high' && a.status !== 'resolved').length,
    medium: alerts.filter((a) => a.severity === 'medium' && a.status !== 'resolved').length,
  };

  const updateStatus = async (id: string, status: AlertStatus) => {
    try {
      if (status === 'resolved') {
        await api.resolveAlert(id);
      }
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      setSelected((prev) => (prev?.id === id ? { ...prev, status } : prev));
    } catch (e) {
      console.error('Failed to update alert status:', e);
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.villageId || !createForm.title || !createForm.message) return;
    setCreating(true);

    try {
      const created = await api.createAlert(createForm);
      setAlerts((prev) => [created, ...prev]);
      setShowCreateModal(false);
      setCreateForm({
        villageId: villageList[0]?.id || '',
        title: '',
        message: '',
        severity: 'HIGH',
        targetAudience: 'ALL',
        actionRequired: 'Boil water before consumption.',
      });
    } catch (err) {
      console.error('Failed to broadcast alert:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDispatchSuccess = (newDispatch: EmergencyDispatch) => {
    setDispatches((prev) => [newDispatch, ...prev]);
  };

  const handleUpdateDispatchStatus = async (id: number, nextStatus: string) => {
    try {
      const updated = await api.updateDispatchStatus(id, nextStatus);
      setDispatches((prev) => prev.map((d) => (d.id === id ? updated : d)));
    } catch (e) {
      console.error('Failed to update dispatch status:', e);
    }
  };

  const activeDispatches = dispatches.filter(
    (d) => d.status !== 'RESOLVED' && d.status !== 'CANCELLED'
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Early Warnings & Advisories"
        subtitle="Monitor and broadcast disease alerts, mobilize rapid response teams, and dispatch ambulances."
        breadcrumb={['Home', 'Alerts']}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                setDispatchVillageId(villageList[0]?.id || '');
                setDispatchReason('');
                setShowDispatchModal(true);
              }}
              className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 inline-flex items-center gap-1.5 font-semibold"
            >
              <Siren className="h-4 w-4 text-red-600" />
              <span>Dispatch Ambulance / Team</span>
            </button>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Broadcast Advisory</span>
            </button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Active Alerts" value={stats.total} icon={Bell} iconColor="text-primary-600" iconBg="bg-primary-50" />
        <StatCard label="Critical Risk" value={stats.critical} icon={ShieldAlert} iconColor="text-risk-critical" iconBg="bg-risk-critical-bg" />
        <StatCard label="High Risk" value={stats.high} icon={AlertTriangle} iconColor="text-risk-high" iconBg="bg-risk-high-bg" />
        <StatCard label="Medium Risk" value={stats.medium} icon={AlertCircle} iconColor="text-risk-medium" iconBg="bg-risk-medium-bg" />
      </div>

      {/* Active Emergency Dispatches Banner */}
      {activeDispatches.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Siren className="h-4 w-4 text-red-600 animate-pulse" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-900">
                Active Field Deployments ({activeDispatches.length} Units En Route / On-Site)
              </h4>
            </div>
            <span className="badge bg-red-100 text-red-800 border border-red-200 font-semibold text-[10px]">
              Live Mobilization
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeDispatches.map((d) => (
              <div key={d.id} className="rounded-lg border border-red-200 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="badge bg-red-100 text-red-700 font-bold text-[10px]">{d.priority_display}</span>
                  <span className="text-[11px] font-semibold text-slate-700">{d.status_display}</span>
                </div>
                <p className="mt-1 text-xs font-bold text-slate-900 truncate">{d.dispatch_type_display}</p>
                <p className="text-xs text-slate-600 truncate">Village: <span className="font-semibold">{d.village_name}</span> ({d.district})</p>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate">Lead: {d.team_lead_name}</span>
                  <span className="shrink-0 font-semibold text-slate-700">ETA: {d.estimated_arrival_minutes}m</span>
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

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alert cards */}
      <div className="space-y-3">
        {loading ? (
          <LoadingState message="Loading early warnings..." />
        ) : filtered.length === 0 ? (
          <div className="card">
            <EmptyState icon={Bell} title="No alerts found" message={`There are no ${activeTab === 'all' ? 'active' : activeTab} alerts at this time.`} />
          </div>
        ) : (
          filtered.map((alert) => {
            const StatusIcon = statusConfig[alert.status].icon;
            const isResolved = alert.status === 'resolved';

            return (
              <div
                key={alert.id}
                onClick={() => setSelected(alert)}
                className={`card card-hover flex cursor-pointer items-start justify-between p-4 transition-all ${
                  isResolved ? 'opacity-60 bg-slate-50/50' : ''
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: riskConfig[alert.severity].bg }}
                  >
                    <AlertTriangle className="h-4 w-4" style={{ color: riskConfig[alert.severity].hex }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-semibold ${isResolved ? 'line-through text-slate-500' : 'text-slate-900'}`}>{alert.title || alert.message}</h3>
                      <RiskBadge level={alert.severity} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-1">{alert.message}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-slate-500" /> {alert.villageName}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-slate-500" /> {timeAgo(alert.detectedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`badge ${statusConfig[alert.status].bg} ${statusConfig[alert.status].color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig[alert.status].label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Alert Detail Drawer */}
      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.title || selected?.message || 'Alert Details'}>
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <RiskBadge level={selected.severity} />
              <span className={`badge ${statusConfig[selected.status].bg} ${statusConfig[selected.status].color}`}>
                {statusConfig[selected.status].label}
              </span>
            </div>

            <div>
              <p className="text-xs text-slate-500">Village</p>
              <p className="text-base font-semibold text-slate-900">{selected.villageName}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Description</p>
              <p className="mt-1 text-sm text-slate-700 leading-relaxed">{selected.message}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Detected</p>
              <p className="text-sm text-slate-700">{formatDateTime(selected.detectedAt)} ({timeAgo(selected.detectedAt)})</p>
            </div>

            {/* Contributing factors */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Contributing Risk Factors</h4>
              <div className="space-y-2">
                {selected.factors.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-100 p-2.5 text-sm text-slate-700">
                    <AlertTriangle className="h-3.5 w-3.5 text-risk-high" />
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2.5 border-t border-slate-200 pt-4">
              {/* Emergency Dispatch Button */}
              <button
                type="button"
                onClick={() => {
                  setDispatchVillageId(selected.villageId);
                  setDispatchReason(`Urgent response for ${selected.title || selected.message}: ${selected.message}`);
                  setShowDispatchModal(true);
                }}
                className="btn-secondary w-full text-red-600 border-red-200 hover:bg-red-50 inline-flex items-center justify-center gap-2 font-semibold"
              >
                <Siren className="h-4 w-4 text-red-600" />
                <span>Dispatch Ambulance / Rapid Response Team</span>
              </button>

              <Link to={`/villages/${selected.villageId}`} className="btn-secondary w-full inline-flex items-center justify-center gap-2">
                <MapPin className="h-4 w-4" /> View Village Profile
              </Link>

              {selected.status !== 'resolved' && (
                <button onClick={() => updateStatus(selected.id, 'resolved')} className="btn-primary w-full inline-flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Resolve Alert (Deactivate)
                </button>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Broadcast Alert Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Broadcast Emergency Advisory" size="md">
        <form onSubmit={handleCreateAlert} className="space-y-4">
          <div>
            <label className="label">Target Village *</label>
            <select
              value={createForm.villageId}
              onChange={(e) => setCreateForm({ ...createForm, villageId: e.target.value })}
              className="input"
              required
            >
              {villageList.map((v) => (
                <option key={v.id} value={v.id}>{v.name} ({v.district})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Advisory Title *</label>
            <input
              type="text"
              placeholder="E.g., Boil Water Advisory Issued"
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              className="input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Severity Level</label>
              <select
                value={createForm.severity}
                onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })}
                className="input"
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div>
              <label className="label">Target Audience</label>
              <select
                value={createForm.targetAudience}
                onChange={(e) => setCreateForm({ ...createForm, targetAudience: e.target.value })}
                className="input"
              >
                <option value="ALL">All (Citizens & Staff)</option>
                <option value="COMMUNITY">Community Citizens</option>
                <option value="HEALTH_WORKER">Health Workers Only</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Advisory Message *</label>
            <textarea
              rows={3}
              placeholder="Describe the detected contamination or health threat..."
              value={createForm.message}
              onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">Recommended Action</label>
            <input
              type="text"
              placeholder="E.g., Boil all drinking water; avoid handpump #3"
              value={createForm.actionRequired}
              onChange={(e) => setCreateForm({ ...createForm, actionRequired: e.target.value })}
              className="input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={creating} className="btn-primary inline-flex items-center gap-1.5">
              <Send className="h-4 w-4" /> {creating ? 'Broadcasting...' : 'Broadcast Alert'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Emergency Dispatch Modal */}
      <DispatchModal
        open={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        initialVillageId={dispatchVillageId}
        initialReason={dispatchReason}
        onSuccess={handleDispatchSuccess}
      />
    </div>
  );
}
