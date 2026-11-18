import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  Plus,
  Search,
  Check,
  XCircle,
  MapPin,
  Phone,
  ShieldCheck,
  Mail,
  AlertTriangle,
} from 'lucide-react';
import { ScheduleAppointmentModal } from './ScheduleAppointmentModal';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { api } from '@/services/api';
import type { Appointment, AppointmentStatus, Village } from '@/types';

interface VerifiedCase {
  id: number;
  village: number;
  village_name: string;
  reporter_name: string;
  reporter_phone: string;
  symptoms: string[];
  people_affected: string;
  age_group?: string;
  notes?: string;
  status: string;
  created_at: string;
  review_notes?: string;
  health_record_id?: number | null;
}

interface AppointmentsViewProps {
  villages?: Village[];
  onNotification?: (msg: string) => void;
}

export function AppointmentsView({ villages = [], onNotification }: AppointmentsViewProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [verifiedCases, setVerifiedCases] = useState<VerifiedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AppointmentStatus>('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);

  // Status update loading state
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [apptList, reportList] = await Promise.all([
        api.getAppointments().catch(() => [] as Appointment[]),
        api.getCommunityReports().catch(() => [] as any[]),
      ]);

      setAppointments(apptList);

      // Extract reports that are verified by health workers
      const verified = (reportList || []).filter(
        (r: any) => r.status === 'VERIFIED' || r.status === 'UNDER_REVIEW'
      );
      setVerifiedCases(verified);
    } catch (err) {
      console.error('Failed to load appointments or verified cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenScheduleForCase = (c: VerifiedCase) => {
    setSelectedCase({
      id: c.id,
      reportId: c.id,
      patientName: c.reporter_name,
      patientPhone: c.reporter_phone,
      villageId: c.village,
      villageName: c.village_name,
      notes: c.review_notes || c.notes,
      symptoms: c.symptoms,
      healthRecordId: c.health_record_id,
    });
    setModalOpen(true);
  };

  const handleOpenScheduleAdHoc = () => {
    setSelectedCase(null);
    setModalOpen(true);
  };

  const handleScheduleSuccess = (newAppt: Appointment) => {
    setAppointments((prev) => [newAppt, ...prev]);
    if (onNotification) {
      onNotification(
        `Appointment scheduled with ${newAppt.doctor_name} for ${newAppt.patient_name}. Official slip sent to abhinav8934g@gmail.com.`
      );
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: AppointmentStatus) => {
    setUpdatingId(id);
    try {
      const updated = await api.updateAppointmentStatus(id, newStatus);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: updated.status, status_display: updated.status_display } : a))
      );
      if (onNotification) {
        onNotification(`Appointment status marked as ${newStatus}.`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const pMatch = a.patient_name.toLowerCase().includes(q);
        const dMatch = a.doctor_name.toLowerCase().includes(q);
        const vMatch = a.village_name.toLowerCase().includes(q);
        const fMatch = a.facility_name.toLowerCase().includes(q);
        if (!pMatch && !dMatch && !vMatch && !fMatch) return false;
      }
      return true;
    });
  }, [appointments, search, statusFilter]);

  const scheduledCount = appointments.filter((a) => a.status === 'SCHEDULED').length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;
  const verifiedWaitingCount = verifiedCases.filter(
    (c) => !appointments.some((a) => a.community_report === c.id)
  ).length;

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Active Scheduled Appointments"
          value={scheduledCount}
          icon={Calendar}
          iconColor="text-teal-600"
          iconBg="bg-teal-50"
        />
        <StatCard
          label="Verified Cases Pending Appt"
          value={verifiedWaitingCount}
          icon={AlertTriangle}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          label="Completed Consultations"
          value={completedCount}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Total Managed Appts"
          value={appointments.length}
          icon={Stethoscope}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
      </div>

      {/* Verified Cases Queue (Awaiting Doctor Scheduling) */}
      <div className="card p-5 border border-amber-200/80 bg-amber-50/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="text-base font-bold text-slate-900">
                Verified Cases Awaiting Authority Doctor Appointment
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Field health workers have verified these reports on-site. Schedule an official primary care doctor or
              hospital consultation.
            </p>
          </div>
          <button
            onClick={handleOpenScheduleAdHoc}
            className="btn-primary inline-flex items-center gap-1.5 self-start sm:self-auto text-xs"
          >
            <Plus className="h-4 w-4" /> Schedule Ad-Hoc Appointment
          </button>
        </div>

        {verifiedCases.length === 0 ? (
          <div className="rounded-lg border border-dashed border-amber-200 p-4 text-center text-xs text-slate-500 bg-white/70">
            No pending verified community reports. All verified cases are either scheduled or resolved.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {verifiedCases.map((c) => {
              const existingAppt = appointments.find((a) => a.community_report === c.id);
              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-slate-900">{c.reporter_name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {c.village_name}
                      </div>
                    </div>
                    {existingAppt ? (
                      <span className="rounded-md bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-800">
                        Appointed ✓
                      </span>
                    ) : (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                        Pending Booking
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 space-y-1 text-xs text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-700">Symptoms:</span>{' '}
                      {(c.symptoms || []).join(', ') || 'Gastrointestinal issue'}
                    </div>
                    {c.reporter_phone && (
                      <div className="flex items-center gap-1 text-slate-500">
                        <Phone className="h-3 w-3" />
                        {c.reporter_phone}
                      </div>
                    )}
                    {c.review_notes && (
                      <div className="text-[11px] text-teal-700 bg-teal-50/80 rounded p-1.5 border border-teal-100">
                        <strong>Worker Note:</strong> {c.review_notes}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    {existingAppt ? (
                      <div className="text-[11px] font-semibold text-teal-700">
                        Dr: {existingAppt.doctor_name.split('(')[0]}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenScheduleForCase(c)}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-teal-700 transition-colors"
                      >
                        <Stethoscope className="h-3.5 w-3.5" />
                        Appoint Doctor
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scheduled Appointments Table & Filters */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by patient, doctor, facility, or village..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
            <span className="text-xs font-semibold text-slate-500 mr-1">Status:</span>
            {(['ALL', 'SCHEDULED', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === s
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading scheduled appointments..." />
        ) : filteredAppointments.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No appointments scheduled"
            message="No clinical appointments match your search or filter criteria."
            action={
              <button onClick={handleOpenScheduleAdHoc} className="btn-primary inline-flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Schedule New Appointment
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Patient & Village</th>
                  <th className="px-4 py-3">Doctor & Healthcare Facility</th>
                  <th className="px-4 py-3">Slot & Date</th>
                  <th className="px-4 py-3">Type & Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAppointments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{a.patient_name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {a.village_name} {a.district ? `(${a.district})` : ''}
                      </div>
                      {a.patient_phone && (
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Phone className="h-2.5 w-2.5" /> {a.patient_phone}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                        <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
                        {a.doctor_name}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        {a.facility_name}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 text-xs flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {a.appointment_date}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {a.time_slot}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <span className="inline-block rounded bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-800 border border-teal-200">
                          {a.appointment_type_display || a.appointment_type}
                        </span>
                        <div>
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${
                              a.priority === 'CRITICAL'
                                ? 'bg-red-100 text-red-800'
                                : a.priority === 'URGENT'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {a.priority_display || a.priority}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          a.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : a.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {a.status === 'COMPLETED' && <Check className="h-3 w-3" />}
                        {a.status === 'CANCELLED' && <XCircle className="h-3 w-3" />}
                        {a.status === 'SCHEDULED' && <Clock className="h-3 w-3" />}
                        {a.status_display || a.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {a.status === 'SCHEDULED' && (
                          <>
                            <button
                              type="button"
                              disabled={updatingId === a.id}
                              onClick={() => handleUpdateStatus(a.id, 'COMPLETED')}
                              className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                              title="Mark consultation completed"
                            >
                              Complete
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === a.id}
                              onClick={() => handleUpdateStatus(a.id, 'CANCELLED')}
                              className="rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
                              title="Cancel appointment"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {a.status === 'COMPLETED' && (
                          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" /> Done
                          </span>
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

      {/* Schedule Modal */}
      <ScheduleAppointmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleScheduleSuccess}
        verifiedCase={selectedCase}
        villages={villages}
      />
    </div>
  );
}
