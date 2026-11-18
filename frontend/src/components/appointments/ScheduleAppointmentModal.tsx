import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Building2,
  Stethoscope,
  AlertCircle,
  CheckCircle2,
  FileText,
  Mail,
  ShieldAlert,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/services/api';
import type { Appointment, AppointmentType, AppointmentPriority, Village } from '@/types';

interface VerifiedCaseContext {
  id?: number | string;
  reportId?: number | string;
  healthRecordId?: number | string;
  patientName?: string;
  patientAge?: number | string;
  patientPhone?: string;
  villageId?: number | string;
  villageName?: string;
  district?: string;
  citizenId?: number | string;
  notes?: string;
  symptoms?: string[];
  diseaseCategory?: string;
}

interface ScheduleAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (appointment: Appointment) => void;
  verifiedCase?: VerifiedCaseContext | null;
  villages?: Village[];
}

const DOCTOR_PRESETS = [
  'Dr. Vivek Sharma (General Physician / Internal Medicine)',
  'Dr. Sunita Rao (Consultant Epidemiologist & Waterborne Care)',
  'Dr. Neha Agarwal (Pediatric Specialist)',
  'Dr. Arvind Mishra (Infectious Diseases & Triage)',
  'Dr. Priya Patel (Clinical Microbiologist & Lab Head)',
];

const FACILITY_PRESETS = [
  'Rampur Primary Health Centre (PHC)',
  'Community Health Centre (CHC) Chandauli',
  'District Hospital Varanasi - Emergency OPD',
  'Saidpur Sub-Divisional Hospital (SDH)',
  'AquaShield Mobile Medical Clinic Unit #1',
];

const TIME_SLOTS = [
  'Morning Slot (09:30 AM - 11:00 AM)',
  'Morning Slot (11:00 AM - 12:30 PM)',
  'Afternoon Slot (02:00 PM - 03:30 PM)',
  'Afternoon Slot (03:30 PM - 05:00 PM)',
  'Evening Emergency Triage (05:30 PM - 07:00 PM)',
];

export function ScheduleAppointmentModal({
  open,
  onClose,
  onSuccess,
  verifiedCase = null,
  villages = [],
}: ScheduleAppointmentModalProps) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    patient_name: '',
    patient_phone: '',
    patient_age: '',
    village: '',
    doctor_name: DOCTOR_PRESETS[0],
    facility_name: FACILITY_PRESETS[0],
    appointment_date: tomorrow,
    time_slot: TIME_SLOTS[0],
    appointment_type: 'CLINICAL_OPD' as AppointmentType,
    priority: 'URGENT' as AppointmentPriority,
    instructions: 'Drink only boiled or chlorinated water. Bring previous prescriptions or diagnostic slips.',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      const defaultVillage =
        verifiedCase?.villageId?.toString() ||
        (villages.length > 0 ? villages[0].id : '1');

      setFormData({
        patient_name: verifiedCase?.patientName || '',
        patient_phone: verifiedCase?.patientPhone || '',
        patient_age: verifiedCase?.patientAge ? String(verifiedCase.patientAge) : '',
        village: defaultVillage,
        doctor_name: DOCTOR_PRESETS[0],
        facility_name: verifiedCase?.villageName
          ? `${verifiedCase.villageName} Primary Health Centre (PHC)`
          : FACILITY_PRESETS[0],
        appointment_date: tomorrow,
        time_slot: TIME_SLOTS[0],
        appointment_type: 'CLINICAL_OPD',
        priority: 'URGENT',
        instructions:
          'Drink boiled or safe water. Bring any previous prescriptions or laboratory slips to the appointment.',
        notes: verifiedCase?.notes
          ? `Verified by field health team: ${verifiedCase.notes}`
          : '',
      });
    }
  }, [open, verifiedCase, villages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patient_name.trim()) {
      setError('Please provide the patient name.');
      return;
    }
    if (!formData.doctor_name.trim()) {
      setError('Please specify or select an assigned doctor.');
      return;
    }
    if (!formData.facility_name.trim()) {
      setError('Please provide the healthcare facility name.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: Partial<Appointment> = {
        patient_name: formData.patient_name.trim(),
        patient_phone: formData.patient_phone.trim() || undefined,
        patient_age: formData.patient_age ? Number(formData.patient_age) : undefined,
        village: Number(formData.village) || 1,
        doctor_name: formData.doctor_name.trim(),
        facility_name: formData.facility_name.trim(),
        appointment_date: formData.appointment_date,
        time_slot: formData.time_slot,
        appointment_type: formData.appointment_type,
        priority: formData.priority,
        instructions: formData.instructions.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      if (verifiedCase?.reportId) {
        payload.community_report = Number(verifiedCase.reportId);
      }
      if (verifiedCase?.healthRecordId) {
        payload.health_record = Number(verifiedCase.healthRecordId);
      }
      if (verifiedCase?.citizenId) {
        payload.citizen = Number(verifiedCase.citizenId);
      }

      const created = await api.createAppointment(payload);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      console.error('Failed to schedule appointment:', err);
      setError(err?.message || 'Failed to schedule appointment. Please check authority permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Schedule Clinical Appointment (Health Authority)" size="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Authority Info Header */}
        <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-teal-600 p-2 text-white shadow-sm mt-0.5">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="text-sm">
              <div className="font-bold text-teal-950">Official Clinical Appointment Scheduling</div>
              <p className="text-teal-700 text-xs mt-0.5 leading-relaxed">
                As Health Authority, you can formally schedule medical consultations, diagnostic lab tests, or triage
                for cases verified by field health workers.
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-teal-800 bg-teal-100/60 rounded px-2 py-0.5 w-fit">
                <Mail className="h-3 w-3 text-teal-600" />
                Notification card dispatched automatically to patient, health worker, and abhinav8934g@gmail.com
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Verified Case Context Tag */}
        {verifiedCase && (
          <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/70 px-3.5 py-2 text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <span>
                Verified Case: <strong>{verifiedCase.patientName || 'Report #' + verifiedCase.reportId}</strong>
                {verifiedCase.villageName ? ` (${verifiedCase.villageName})` : ''}
              </span>
            </div>
            {verifiedCase.diseaseCategory && (
              <span className="rounded bg-blue-200/80 px-2 py-0.5 font-bold text-blue-900 text-[11px]">
                {verifiedCase.diseaseCategory}
              </span>
            )}
          </div>
        )}

        {/* Patient Details Section */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-slate-400" />
            Patient Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.patient_name}
                onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                placeholder="e.g. Ramesh Kumar"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Age</label>
              <input
                type="number"
                min="0"
                max="120"
                value={formData.patient_age}
                onChange={(e) => setFormData({ ...formData, patient_age: e.target.value })}
                placeholder="Years (e.g. 35)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Contact Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="tel"
                  value={formData.patient_phone}
                  onChange={(e) => setFormData({ ...formData, patient_phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Village / Jurisdiction <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.district})
                  </option>
                ))}
                {villages.length === 0 && (
                  <>
                    <option value="1">Rampur (Varanasi)</option>
                    <option value="13">Dhanapur (Chandauli)</option>
                    <option value="28">Saidpur (Ghazipur)</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Doctor & Facility Section */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            Medical Provider & Facility
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Doctor / Specialist <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                list="doctor-presets"
                required
                value={formData.doctor_name}
                onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })}
                placeholder="Doctor name and specialization"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <datalist id="doctor-presets">
                {DOCTOR_PRESETS.map((doc) => (
                  <option key={doc} value={doc} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Healthcare Facility <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                list="facility-presets"
                required
                value={formData.facility_name}
                onChange={(e) => setFormData({ ...formData, facility_name: e.target.value })}
                placeholder="PHC, CHC, or District Hospital"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <datalist id="facility-presets">
                {FACILITY_PRESETS.map((fac) => (
                  <option key={fac} value={fac} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

        {/* Date, Time & Classification */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            Date, Slot & Triage Priority
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Appointment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.appointment_date}
                onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Time Slot <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.time_slot}
                onChange={(e) => setFormData({ ...formData, time_slot: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Appointment Type</label>
              <select
                value={formData.appointment_type}
                onChange={(e) => setFormData({ ...formData, appointment_type: e.target.value as AppointmentType })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
              >
                <option value="CLINICAL_OPD">Clinical OPD</option>
                <option value="DIAGNOSTIC_LAB">Diagnostic Lab Test</option>
                <option value="OUTBREAK_TRIAGE">Outbreak Triage</option>
                <option value="POST_TREATMENT_FOLLOWUP">Follow-up Review</option>
                <option value="SPECIALIST_REFERRAL">Specialist Referral</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority Tier</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as AppointmentPriority })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 font-semibold"
              >
                <option value="ROUTINE" className="text-emerald-700">
                  Routine Care
                </option>
                <option value="URGENT" className="text-amber-700">
                  Urgent (24h)
                </option>
                <option value="CRITICAL" className="text-red-700">
                  Critical Immediate
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Patient Directives & Authority Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Patient Directives & Preparation
            </label>
            <textarea
              rows={3}
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="e.g. Fasting instructions, hydration steps, prior prescriptions to carry..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Authority Clinical Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Internal public health authority directives or outbreak correlation notes..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Scheduling & Dispatching Email...
              </>
            ) : (
              <>
                <Stethoscope className="h-4 w-4" />
                Confirm & Dispatch Appointment
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
