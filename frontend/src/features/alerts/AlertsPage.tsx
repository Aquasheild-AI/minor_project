import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ShieldAlert, AlertTriangle, AlertCircle, CheckCircle2, Clock, MapPin, Plus, Send } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { api } from '@/services/api';
import { riskConfig, timeAgo, formatDateTime } from '@/utils/risk';
import type { Alert, AlertStatus, Village } from '@/types';

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

  useEffect(() => {
    Promise.all([api.getAlerts(), api.getVillages()]).then(([a, v]) => {
      setAlerts(a);
      setVillageList(v);
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

  return (
    <div>
      <PageHeader
        title="Early Warnings & Advisories"
        subtitle="Monitor and broadcast disease and water contamination alerts across monitored communities."
        breadcrumb={['Home', 'Alerts']}
        actions={
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Broadcast Advisory
          </button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Active Alerts" value={stats.total} icon={Bell} iconColor="text-primary-600" iconBg="bg-primary-50" />
        <StatCard label="Critical Risk" value={stats.critical} icon={ShieldAlert} iconColor="text-risk-critical" iconBg="bg-risk-critical-bg" />
        <StatCard label="High Risk" value={stats.high} icon={AlertTriangle} iconColor="text-risk-high" iconBg="bg-risk-high-bg" />
        <StatCard label="Medium Risk" value={stats.medium} icon={AlertCircle} iconColor="text-risk-medium" iconBg="bg-risk-medium-bg" />
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-slate-200">
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
      <div className="mt-4 space-y-3">
        {loading ? (
          <LoadingState message="Loading early warnings..." />
        ) : filtered.length === 0 ? (
          <div className="card">
            <EmptyState icon={Bell} title="No Alerts" message="No active alerts found for this filter. All monitored villages are within normal limits." />
          </div>
        ) : (
          filtered.map((alert) => {
            const cfg = riskConfig[alert.severity];
            const status = statusConfig[alert.status];
            return (
              <div
                key={alert.id}
                className={`card cursor-pointer p-4 transition-shadow hover:shadow-card-hover ${alert.status === 'active' ? 'border-l-4' : ''}`}
                style={alert.status === 'active' ? { borderLeftColor: cfg.hex } : {}}
                onClick={() => setSelected(alert)}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: cfg.hex + '15' }}>
                      <Bell className="h-5 w-5" style={{ color: cfg.hex }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <RiskBadge level={alert.severity} />
                        <span className="badge bg-slate-100 text-slate-600">{status.label}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{alert.message}</p>
                      <p className="text-xs text-slate-500">{alert.villageName} — Severity Level: {alert.severity.toUpperCase()}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {alert.factors.map((f, i) => (
                          <span key={i} className="text-xs text-slate-400">• {f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs text-slate-400">{timeAgo(alert.detectedAt)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelected(alert); }}
                      className="text-xs font-medium text-primary-600 hover:underline"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Alert Details Drawer */}
      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Alert Details">
        {selected && (
          <div className="space-y-5">
            {/* Severity header */}
            <div className="rounded-lg p-4" style={{ backgroundColor: riskConfig[selected.severity].hex + '10' }}>
              <div className="flex items-center gap-2">
                <RiskBadge level={selected.severity} />
                <span className="badge bg-slate-100 text-slate-600">{statusConfig[selected.status].label}</span>
              </div>
              <p className="mt-2 text-base font-bold text-slate-900">{selected.message}</p>
              <p className="text-sm text-slate-500">{selected.villageName}</p>
            </div>

            {/* Key info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Risk Score</p>
                <p className="text-xl font-bold" style={{ color: riskConfig[selected.severity].hex }}>{selected.riskScore}%</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Detected</p>
                <p className="text-sm font-semibold text-slate-900">{formatDateTime(selected.detectedAt)}</p>
              </div>
            </div>

            {/* Recommended action / checklist */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Advisory Action</h4>
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
            <div className="space-y-2 border-t border-slate-200 pt-4">
              <Link to={`/villages/${selected.villageId}`} className="btn-secondary w-full"><MapPin className="h-4 w-4" /> View Village Profile</Link>
              {selected.status !== 'resolved' && (
                <button onClick={() => updateStatus(selected.id, 'resolved')} className="btn-primary w-full">
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
            <button type="submit" disabled={creating} className="btn-primary">
              <Send className="h-4 w-4" /> {creating ? 'Broadcasting...' : 'Broadcast Alert'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
