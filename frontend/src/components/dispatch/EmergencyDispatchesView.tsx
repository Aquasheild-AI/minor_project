import { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Phone,
  User,
  MapPin,
  Mail,
  ShieldAlert,
  Check,
  XCircle,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { api } from '@/services/api';
import type { EmergencyDispatch, DispatchType, DispatchPriority, DispatchStatus, Village } from '@/types';

interface EmergencyDispatchesViewProps {
  villages?: Village[];
  onNotification?: (msg: string) => void;
}

const DISPATCH_TYPES: { type: DispatchType; label: string; vehicle: string }[] = [
  { type: 'AMBULANCE', label: 'Ambulance Emergency Evacuation', vehicle: 'UP-65-AMB-108' },
  { type: 'RAPID_RESPONSE_TEAM', label: 'Rapid Epidemiological Response Team', vehicle: 'UP-65-EPI-04' },
  { type: 'MOBILE_MEDICAL_UNIT', label: 'Mobile Medical Unit (Van Clinic)', vehicle: 'UP-61-MMU-02' },
  { type: 'WATER_CHLORINATION_UNIT', label: 'Emergency Water Chlorination Unit', vehicle: 'UP-65-WTR-01' },
];

export function EmergencyDispatchesView({ villages = [], onNotification }: EmergencyDispatchesViewProps) {
  const [dispatches, setDispatches] = useState<EmergencyDispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DispatchStatus>('ALL');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    village: '1',
    dispatch_type: 'AMBULANCE' as DispatchType,
    priority: 'CRITICAL' as DispatchPriority,
    vehicle_number: 'UP-65-AMB-108',
    team_lead_name: 'Dr. Ramesh Singh (Emergency MO)',
    team_lead_phone: '+91 98765 43210',
    reason: 'Outbreak cluster triage and medical evacuation to Primary Health Centre.',
    estimated_arrival_minutes: '20',
  });

  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadDispatches = async () => {
    setLoading(true);
    try {
      const data = await api.getDispatches();
      setDispatches(data);
    } catch (err) {
      console.error('Failed to load dispatches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDispatches();
  }, []);

  const handleOpenModal = () => {
    setModalError(null);
    setFormData({
      village: villages.length > 0 ? villages[0].id : '1',
      dispatch_type: 'AMBULANCE',
      priority: 'CRITICAL',
      vehicle_number: 'UP-65-AMB-108',
      team_lead_name: 'Dr. Ramesh Singh (Emergency MO)',
      team_lead_phone: '+91 98765 43210',
      reason: 'Urgent medical ambulance dispatch for severe gastrointestinal cluster.',
      estimated_arrival_minutes: '20',
    });
    setModalOpen(true);
  };

  const handleTypeChange = (t: DispatchType) => {
    const preset = DISPATCH_TYPES.find((item) => item.type === t);
    setFormData((prev) => ({
      ...prev,
      dispatch_type: t,
      vehicle_number: preset ? preset.vehicle : prev.vehicle_number,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    try {
      const selectedVillage = villages.find((v) => v.id === formData.village);
      const created = await api.createDispatch({
        village: Number(formData.village) || 1,
        village_name: selectedVillage ? selectedVillage.name : 'Target Village',
        dispatch_type: formData.dispatch_type,
        priority: formData.priority,
        vehicle_number: formData.vehicle_number.trim(),
        team_lead_name: formData.team_lead_name.trim(),
        team_lead_phone: formData.team_lead_phone.trim(),
        reason: formData.reason.trim(),
        estimated_arrival_minutes: Number(formData.estimated_arrival_minutes) || 20,
      });

      setDispatches((prev) => [created, ...prev]);
      setModalOpen(false);
      if (onNotification) {
        onNotification(
          `Emergency ${created.dispatch_type_display || created.dispatch_type} dispatched! Dispatch alert email sent to abhinav8934g@gmail.com and district response teams.`
        );
      }
    } catch (err: any) {
      console.error('Failed to create dispatch:', err);
      setModalError(err.message || 'Failed to dispatch team.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: DispatchStatus) => {
    setUpdatingId(id);
    try {
      const updated = await api.updateDispatchStatus(id, newStatus);
      setDispatches((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: updated.status, status_display: updated.status_display } : d))
      );
      if (onNotification) {
        onNotification(`Dispatch status updated to ${newStatus}.`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update dispatch status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => {
    return dispatches.filter((d) => {
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const vMatch = d.village_name?.toLowerCase().includes(q);
        const tMatch = d.team_lead_name?.toLowerCase().includes(q);
        const vehMatch = d.vehicle_number?.toLowerCase().includes(q);
        const rMatch = d.reason?.toLowerCase().includes(q);
        if (!vMatch && !tMatch && !vehMatch && !rMatch) return false;
      }
      return true;
    });
  }, [dispatches, search, statusFilter]);

  const activeCount = dispatches.filter((d) => d.status === 'DISPATCHED' || d.status === 'ON_SITE').length;
  const ambulanceCount = dispatches.filter((d) => d.dispatch_type === 'AMBULANCE').length;
  const resolvedCount = dispatches.filter((d) => d.status === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active Deployments" value={activeCount} icon={Truck} iconColor="text-rose-600" iconBg="bg-rose-50" />
        <StatCard label="Ambulance Runs" value={ambulanceCount} icon={ShieldAlert} iconColor="text-red-600" iconBg="bg-red-50" />
        <StatCard label="Resolved Incidents" value={resolvedCount} icon={CheckCircle2} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <StatCard label="Total Deployments" value={dispatches.length} icon={Truck} iconColor="text-indigo-600" iconBg="bg-indigo-50" />
      </div>

      {/* Dispatches Table & Header */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by village, team lead, vehicle, or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
            <div className="flex items-center gap-1">
              {(['ALL', 'DISPATCHED', 'ON_SITE', 'RESOLVED'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    statusFilter === s
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s === 'ALL' ? 'All' : s.replace('_', ' ')}
                </button>
              ))}
            </div>
            <button onClick={handleOpenModal} className="btn-primary inline-flex items-center gap-1.5 text-xs">
              <Plus className="h-4 w-4" /> Dispatch Unit
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading emergency dispatches..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No dispatches found"
            message="No emergency medical or water relief dispatches match your query."
            action={
              <button onClick={handleOpenModal} className="btn-primary inline-flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Dispatch Ambulance
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Deployment Unit & Vehicle</th>
                  <th className="px-4 py-3">Village & Target Area</th>
                  <th className="px-4 py-3">Team Lead & Contact</th>
                  <th className="px-4 py-3">ETA & Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Truck className="h-4 w-4 text-rose-600 shrink-0" />
                        {d.dispatch_type_display || d.dispatch_type.replace('_', ' ')}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        Vehicle: {d.vehicle_number || 'N/A'}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 text-xs flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {d.village_name} {d.district ? `(${d.district})` : ''}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 text-xs flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" />
                        {d.team_lead_name || 'Emergency Squad'}
                      </div>
                      {d.team_lead_phone && (
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Phone className="h-2.5 w-2.5" /> {d.team_lead_phone}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 max-w-xs">
                      {d.estimated_arrival_minutes && (
                        <div className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> ETA: ~{d.estimated_arrival_minutes} mins
                        </div>
                      )}
                      <div className="text-xs text-slate-600 truncate mt-0.5" title={d.reason}>
                        {d.reason || 'Medical response'}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          d.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : d.status === 'ON_SITE'
                            ? 'bg-blue-100 text-blue-800'
                            : d.status === 'CANCELLED'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-rose-100 text-rose-800 animate-pulse'
                        }`}
                      >
                        {d.status === 'RESOLVED' && <Check className="h-3 w-3" />}
                        {d.status === 'ON_SITE' && <CheckCircle2 className="h-3 w-3" />}
                        {d.status === 'DISPATCHED' && <Truck className="h-3 w-3" />}
                        {d.status_display || d.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {d.status === 'DISPATCHED' && (
                          <button
                            type="button"
                            disabled={updatingId === d.id}
                            onClick={() => handleUpdateStatus(d.id, 'ON_SITE')}
                            className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                          >
                            Mark On-Site
                          </button>
                        )}
                        {d.status === 'ON_SITE' && (
                          <button
                            type="button"
                            disabled={updatingId === d.id}
                            onClick={() => handleUpdateStatus(d.id, 'RESOLVED')}
                            className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                          >
                            Resolve
                          </button>
                        )}
                        {d.status !== 'RESOLVED' && d.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            disabled={updatingId === d.id}
                            onClick={() => handleUpdateStatus(d.id, 'CANCELLED')}
                            className="rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dispatch Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Emergency Response Team Dispatch" size="lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50/70 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-red-600 p-2 text-white shadow-sm mt-0.5">
                <Truck className="h-5 w-5" />
              </div>
              <div className="text-sm">
                <div className="font-bold text-red-950">Immediate Deployment & Real-Time Alert Dispatch</div>
                <p className="text-red-700 text-xs mt-0.5">
                  Confirming this dispatch triggers an urgent incident broadcast to response leads and sends a live
                  dispatch dispatch manifest to <strong>abhinav8934g@gmail.com</strong>.
                </p>
              </div>
            </div>
          </div>

          {modalError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Village</label>
              <select
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
              >
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.district})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dispatch Unit Type</label>
              <select
                value={formData.dispatch_type}
                onChange={(e) => handleTypeChange(e.target.value as DispatchType)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none font-semibold"
              >
                <option value="AMBULANCE">Ambulance (Emergency Patient Evacuation)</option>
                <option value="RAPID_RESPONSE_TEAM">Rapid Response Team (Epidemic Investigation)</option>
                <option value="MOBILE_MEDICAL_UNIT">Mobile Medical Unit (Van Clinic)</option>
                <option value="WATER_CHLORINATION_UNIT">Water Chlorination & Decontamination Unit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle / Unit Registration</label>
              <input
                type="text"
                required
                value={formData.vehicle_number}
                onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                placeholder="UP-65-AMB-108"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority Tier</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as DispatchPriority })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none font-semibold"
              >
                <option value="CRITICAL" className="text-red-700 font-bold">
                  Critical Emergency (Priority 1)
                </option>
                <option value="HIGH" className="text-amber-700 font-bold">
                  High Priority
                </option>
                <option value="STANDARD" className="text-slate-700">
                  Standard Deployment
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Team Lead Name</label>
              <input
                type="text"
                required
                value={formData.team_lead_name}
                onChange={(e) => setFormData({ ...formData, team_lead_name: e.target.value })}
                placeholder="Doctor or Paramedic in-charge"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Team Lead Emergency Phone</label>
              <input
                type="tel"
                required
                value={formData.team_lead_phone}
                onChange={(e) => setFormData({ ...formData, team_lead_phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Arrival (Minutes)</label>
              <input
                type="number"
                min="5"
                max="180"
                value={formData.estimated_arrival_minutes}
                onChange={(e) => setFormData({ ...formData, estimated_arrival_minutes: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Deployment Reason & Directives</label>
              <textarea
                rows={3}
                required
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Reason for deployment, clinical symptoms reported, special equipment needed..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Dispatching...
                </>
              ) : (
                <>
                  <Truck className="h-4 w-4" />
                  Confirm Emergency Dispatch
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
