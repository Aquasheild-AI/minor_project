import { useState, useEffect } from 'react';
import {
  Siren,
  Truck,
  HeartPulse,
  Droplets,
  Tent,
  AlertTriangle,
  Phone,
  User,
  Clock,
  CheckCircle2,
  X,
  Send,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/services/api';
import type { Village, DispatchType, DispatchPriority, EmergencyDispatch } from '@/types';

interface DispatchModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (dispatch: EmergencyDispatch) => void;
  initialVillageId?: string | number;
  initialReason?: string;
  initialType?: DispatchType;
}

export function DispatchModal({
  open,
  onClose,
  onSuccess,
  initialVillageId,
  initialReason = '',
  initialType = 'AMBULANCE',
}: DispatchModalProps) {
  const [villages, setVillages] = useState<Village[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState<{
    villageId: string;
    dispatchType: DispatchType;
    priority: DispatchPriority;
    vehicleNumber: string;
    teamLeadName: string;
    teamLeadPhone: string;
    reason: string;
    etaMinutes: number;
  }>({
    villageId: '',
    dispatchType: initialType,
    priority: 'CRITICAL',
    vehicleNumber: 'UP-65-AMB-108',
    teamLeadName: 'Dr. Arvind Verma (RRT Lead)',
    teamLeadPhone: '+91 9876543210',
    reason: initialReason || 'Acute waterborne disease outbreak cluster requiring immediate on-site medical evacuation.',
    etaMinutes: 20,
  });

  useEffect(() => {
    if (open) {
      api.getVillages().then((vList) => {
        setVillages(vList || []);
        if (vList && vList.length > 0) {
          const defaultVId = initialVillageId ? String(initialVillageId) : String(vList[0].id);
          setForm((prev) => ({
            ...prev,
            villageId: defaultVId,
            dispatchType: initialType,
            reason: initialReason || prev.reason,
          }));
        }
      });
      setError('');
      setSuccess(false);
    }
  }, [open, initialVillageId, initialReason, initialType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.villageId || !form.teamLeadName || !form.reason) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        village: Number(form.villageId),
        dispatch_type: form.dispatchType,
        priority: form.priority,
        vehicle_number: form.vehicleNumber,
        team_lead_name: form.teamLeadName,
        team_lead_phone: form.teamLeadPhone,
        reason: form.reason,
        estimated_arrival_minutes: Number(form.etaMinutes) || 25,
      };

      const result = await api.createDispatch(payload);
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.(result);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch emergency response unit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mobilize Emergency Response Unit"
      size="lg"
    >
      {success ? (
        <div className="py-8 text-center space-y-3">
          <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Emergency Unit Dispatched!</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Emergency intervention details have been logged and broadcasted to local health workers and medical facilities.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Intervention Type Selector */}
          <div>
            <label className="label">Intervention / Unit Type</label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                {
                  type: 'AMBULANCE' as DispatchType,
                  title: 'Emergency Ambulance',
                  desc: 'Patient evacuation & critical transport',
                  icon: Truck,
                  color: 'text-red-600',
                  bg: 'bg-red-50 border-red-200',
                },
                {
                  type: 'RAPID_RESPONSE_TEAM' as DispatchType,
                  title: 'Rapid Response Team (RRT)',
                  desc: 'Doctors & epidemiologists on-site',
                  icon: HeartPulse,
                  color: 'text-blue-600',
                  bg: 'bg-blue-50 border-blue-200',
                },
                {
                  type: 'WATER_CHLORINATION_UNIT' as DispatchType,
                  title: 'Water Testing & Chlorination',
                  desc: 'Mobile lab & source disinfection',
                  icon: Droplets,
                  color: 'text-teal-600',
                  bg: 'bg-teal-50 border-teal-200',
                },
                {
                  type: 'MEDICAL_RELIEF_CAMP' as DispatchType,
                  title: 'Medical Relief Camp',
                  desc: 'Field clinic & triage point setup',
                  icon: Tent,
                  color: 'text-amber-600',
                  bg: 'bg-amber-50 border-amber-200',
                },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = form.dispatchType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setForm({ ...form, dispatchType: item.type })}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? `${item.bg} ring-2 ring-primary-500/20 font-semibold shadow-xs`
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-xs ${item.color} shrink-0`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.title}</p>
                      <p className="text-[11px] text-slate-500 leading-snug">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Village */}
            <div>
              <label className="label">Target Village *</label>
              <select
                value={form.villageId}
                onChange={(e) => setForm({ ...form, villageId: e.target.value })}
                className="input"
                required
              >
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.district})
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="label">Emergency Priority Level</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as DispatchPriority })}
                className="input"
              >
                <option value="CRITICAL">Critical (Immediate Code-Red)</option>
                <option value="HIGH">High Priority (Urgent)</option>
                <option value="STANDARD">Standard Intervention</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Vehicle Number */}
            <div>
              <label className="label flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-slate-400" />
                <span>Vehicle / Unit ID</span>
              </label>
              <input
                type="text"
                value={form.vehicleNumber}
                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                placeholder="e.g. UP-65-AMB-108"
                className="input"
              />
            </div>

            {/* Team Lead */}
            <div>
              <label className="label flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>Team Lead / Driver *</span>
              </label>
              <input
                type="text"
                value={form.teamLeadName}
                onChange={(e) => setForm({ ...form, teamLeadName: e.target.value })}
                placeholder="Dr. / Paramedic Name"
                className="input"
                required
              />
            </div>

            {/* Contact Phone */}
            <div>
              <label className="label flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>Lead Phone</span>
              </label>
              <input
                type="text"
                value={form.teamLeadPhone}
                onChange={(e) => setForm({ ...form, teamLeadPhone: e.target.value })}
                placeholder="+91 98XXXXXXXX"
                className="input"
              />
            </div>
          </div>

          {/* Reason & Medical Directives */}
          <div>
            <label className="label flex items-center justify-between">
              <span>Reason & Medical Directives *</span>
              <span className="text-[11px] text-slate-400">Sent to on-duty health workers</span>
            </label>
            <textarea
              rows={3}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Describe symptoms, acute patient counts, or water contamination severity..."
              className="input"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>Est. Transit ETA:</span>
              <input
                type="number"
                min="5"
                max="180"
                value={form.etaMinutes}
                onChange={(e) => setForm({ ...form, etaMinutes: Number(e.target.value) || 20 })}
                className="w-16 rounded border border-slate-300 px-2 py-1 text-xs text-center font-semibold text-slate-800"
              />
              <span>minutes</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary text-sm bg-red-600 hover:bg-red-700 text-white inline-flex items-center gap-2"
              >
                <Siren className="h-4 w-4" />
                <span>{submitting ? 'Dispatching...' : 'Confirm & Mobilize Unit'}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
