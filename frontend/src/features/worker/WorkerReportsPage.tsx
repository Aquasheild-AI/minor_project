import { useState, useEffect } from 'react';
import { FileText, Search, CheckCircle2, Clock, AlertTriangle, Eye, Check, MapPin, Calendar, User, Phone, Stethoscope } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, Pagination } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/services/api';
import { formatDate } from '@/utils/risk';
import type { Appointment } from '@/types';

interface CommunityReport {
  id: number;
  village: number;
  village_name: string;
  reporter_name: string;
  reporter_phone: string;
  symptoms: string[];
  people_affected: string;
  age_group?: string;
  notes?: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'RESOLVED';
  status_display: string;
  created_at: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  review_notes?: string;
  health_record_id?: number | null;
}

const statusBadgeVariant: Record<string, 'info' | 'medium' | 'low'> = {
  SUBMITTED: 'info',
  UNDER_REVIEW: 'medium',
  VERIFIED: 'medium',
  RESOLVED: 'low',
};

export function WorkerReportsPage() {
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Review Modal State
  const [selectedReport, setSelectedReport] = useState<CommunityReport | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'UNDER_REVIEW' | 'VERIFIED' | 'RESOLVED'>('RESOLVED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [createHealthRecord, setCreateHealthRecord] = useState(false);
  const [recordDiseaseType, setRecordDiseaseType] = useState('ACUTE_DIARRHEA');
  const [recordSeverity, setRecordSeverity] = useState('MODERATE');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [data, appts] = await Promise.all([
        api.getCommunityReports(),
        api.getAppointments().catch(() => [] as Appointment[]),
      ]);
      setReports(data);
      setAppointments(appts || []);
    } catch (err) {
      console.error('Failed to load community reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const openReview = (report: CommunityReport) => {
    setSelectedReport(report);
    setReviewStatus(report.status === 'RESOLVED' ? 'RESOLVED' : 'VERIFIED');
    setReviewNotes(report.review_notes || '');
    // If a clinical health record is already linked, reflect that
    setCreateHealthRecord(Boolean(report.health_record_id));
    const sStr = (report.symptoms || []).join(' ').toLowerCase();
    if (sStr.includes('cholera')) setRecordDiseaseType('CHOLERA');
    else if (sStr.includes('typhoid')) setRecordDiseaseType('TYPHOID');
    else if (sStr.includes('hepatitis')) setRecordDiseaseType('VIRAL_HEPATITIS');
    else if (sStr.includes('fever') && sStr.includes('headache')) setRecordDiseaseType('TYPHOID');
    else setRecordDiseaseType('ACUTE_DIARRHEA');
    setRecordSeverity('MODERATE');
    setModalError(null);
  };

  const handleReviewSubmit = async () => {
    if (!selectedReport) return;
    setSubmitting(true);
    setModalError(null);

    try {
      await api.reviewCommunityReport(
        String(selectedReport.id),
        {
          status: reviewStatus,
          review_notes: reviewNotes.trim() || 'Reviewed and field action verified.',
          create_health_record: createHealthRecord,
          disease_type: recordDiseaseType,
          severity: recordSeverity,
        }
      );
      setSelectedReport(null);
      await loadReports();
    } catch (err: any) {
      setModalError(err.message || 'Failed to submit report review.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = reports.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const villageMatch = r.village_name?.toLowerCase().includes(q);
      const nameMatch = r.reporter_name?.toLowerCase().includes(q);
      const symptomsMatch = r.symptoms?.some((s) => s.toLowerCase().includes(q));
      if (!villageMatch && !nameMatch && !symptomsMatch) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const pendingCount = reports.filter((r) => r.status === 'SUBMITTED').length;
  const underReviewCount = reports.filter((r) => r.status === 'UNDER_REVIEW').length;
  const resolvedCount = reports.filter((r) => r.status === 'RESOLVED').length;

  return (
    <div>
      <PageHeader
        title="Community Reports Triage"
        subtitle="Review, verify, and resolve disease reports submitted by local citizens."
        breadcrumb={['Home', 'Community Reports']}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <div className="card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">New Reports (Pending)</p>
            <p className="text-xl font-bold text-slate-900">{pendingCount}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Under Field Review</p>
            <p className="text-xl font-bold text-slate-900">{underReviewCount}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Resolved Reports</p>
            <p className="text-xl font-bold text-slate-900">{resolvedCount}</p>
          </div>
        </div>
      </div>

      {/* Active Authority Scheduled Clinical Appointments */}
      {appointments.filter((a) => a.status === 'SCHEDULED').length > 0 && (
        <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50/80 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-teal-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900">
                Authority Scheduled Clinical Appointments ({appointments.filter((a) => a.status === 'SCHEDULED').length} Active)
              </h4>
            </div>
            <span className="badge bg-teal-100 text-teal-800 border border-teal-200 font-semibold text-[10px]">
              Assigned Jurisdictions
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {appointments
              .filter((a) => a.status === 'SCHEDULED')
              .map((a) => (
                <div key={a.id} className="rounded-lg border border-teal-100 bg-white p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{a.patient_name}</span>
                    <span className="text-[10px] rounded bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5">
                      {a.priority_display || a.priority}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    📍 {a.village_name} {a.district ? `(${a.district})` : ''}
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-100 text-[11px] space-y-0.5">
                    <div className="font-semibold text-teal-800 truncate">🩺 {a.doctor_name}</div>
                    <div className="text-slate-500 truncate">🏥 {a.facility_name}</div>
                    <div className="text-slate-400">📅 {a.appointment_date} ({a.time_slot})</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="card mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by village, reporter, or symptoms..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input pl-10"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="input"
            >
              <option value="">All Review Statuses</option>
              <option value="SUBMITTED">Pending (Submitted)</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <LoadingState message="Loading community reports..." />
        ) : paged.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No community reports found"
            message="No reports match your filters. Reports submitted by citizens in your jurisdiction will appear here."
          />
        ) : (
          <>
            <Table
              columns={[
                {
                  key: 'village',
                  header: 'Village',
                  render: (r: CommunityReport) => (
                    <div>
                      <p className="font-semibold text-slate-900">{r.village_name}</p>
                      <p className="text-xs text-slate-500">{formatDate(r.created_at)}</p>
                    </div>
                  ),
                },
                {
                  key: 'reporter',
                  header: 'Reporter',
                  render: (r: CommunityReport) => (
                    <div>
                      <p className="font-medium text-slate-900">{r.reporter_name || 'Anonymous'}</p>
                      {r.reporter_phone && (
                        <p className="text-xs text-slate-400">{r.reporter_phone}</p>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'symptoms',
                  header: 'Symptoms Observed',
                  render: (r: CommunityReport) => (
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {Array.isArray(r.symptoms) && r.symptoms.map((s, idx) => (
                        <span key={idx} className="badge bg-slate-100 text-slate-700 text-[11px] py-0.5">
                          {s}
                        </span>
                      ))}
                    </div>
                  ),
                },
                {
                  key: 'affected',
                  header: 'Affected',
                  render: (r: CommunityReport) => (
                    <span className="font-medium text-slate-700">{r.people_affected} people</span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (r: CommunityReport) => {
                    const linkedAppt = appointments.find(
                      (a) =>
                        a.community_report === r.id ||
                        (a.village === r.village && a.patient_name === r.reporter_name)
                    );

                    return (
                      <div>
                        <Badge variant={statusBadgeVariant[r.status] || 'info'}>
                          {r.status_display || r.status}
                        </Badge>
                        {linkedAppt ? (
                          <p className="text-[10px] text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded font-bold mt-1 inline-flex items-center gap-1">
                            <Stethoscope className="h-3 w-3 text-teal-600" />
                            <span>{linkedAppt.doctor_name.split('(')[0]}</span>
                          </p>
                        ) : r.status === 'VERIFIED' ? (
                          <p className="text-[10px] text-teal-700 font-semibold mt-1">
                            🩺 Authority Appt Eligible
                          </p>
                        ) : null}
                        {r.health_record_id && (
                          <p className="text-[10px] text-primary-700 font-semibold mt-0.5">
                            ✓ Record #{r.health_record_id}
                          </p>
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: 'actions',
                  header: 'Action',
                  render: (r: CommunityReport) => (
                    <button
                      onClick={() => openReview(r)}
                      className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Review</span>
                    </button>
                  ),
                },
              ]}
              data={paged}
              rowKey={(r) => String(r.id)}
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Review & Triage Modal */}
      {selectedReport && (
        <Modal
          open={true}
          onClose={() => setSelectedReport(null)}
          title={`Review Report #${selectedReport.id}: ${selectedReport.village_name}`}
          size="md"
        >
          <div className="space-y-4">
            {modalError && (
              <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-200">
                {modalError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 border border-slate-100 text-xs">
              <div>
                <p className="text-slate-400">Reporter</p>
                <p className="font-semibold text-slate-900 mt-0.5">{selectedReport.reporter_name || 'Citizen'}</p>
                {selectedReport.reporter_phone && (
                  <p className="text-slate-600 mt-0.5 flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {selectedReport.reporter_phone}
                  </p>
                )}
              </div>
              <div>
                <p className="text-slate-400">Date & People Affected</p>
                <p className="font-semibold text-slate-900 mt-0.5">{formatDate(selectedReport.created_at)}</p>
                <p className="text-slate-600 mt-0.5">{selectedReport.people_affected} people{selectedReport.age_group ? ` (Age: ${selectedReport.age_group})` : ''}</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-400">Symptoms</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedReport.symptoms?.map((s, idx) => (
                    <span key={idx} className="badge bg-white border border-slate-200 text-slate-800">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              {selectedReport.notes && (
                <div className="col-span-2">
                  <p className="text-slate-400">Citizen Notes</p>
                  <p className="text-slate-700 italic mt-0.5">"{selectedReport.notes}"</p>
                </div>
              )}
            </div>

            {/* Scheduled Appointment Slip (if already appointed by authority) */}
            {(() => {
              const appt = appointments.find(
                (a) =>
                  a.community_report === selectedReport.id ||
                  (a.village === selectedReport.village && a.patient_name === selectedReport.reporter_name)
              );
              if (!appt) return null;
              return (
                <div className="rounded-xl border border-teal-200 bg-teal-50/80 p-3.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-teal-900">
                    <span className="flex items-center gap-1.5">
                      <Stethoscope className="h-4 w-4 text-teal-600" />
                      Authority Appointed Doctor Consultation
                    </span>
                    <span className="rounded bg-teal-200 px-2 py-0.5 text-[10px] font-bold text-teal-900">
                      {appt.status_display || appt.status}
                    </span>
                  </div>
                  <div className="mt-2 space-y-0.5 text-slate-700">
                    <div>
                      <strong>Doctor:</strong> {appt.doctor_name}
                    </div>
                    <div>
                      <strong>Facility:</strong> {appt.facility_name}
                    </div>
                    <div>
                      <strong>Date & Slot:</strong> {appt.appointment_date} ({appt.time_slot})
                    </div>
                    {appt.instructions && (
                      <div className="mt-1.5 rounded bg-white/80 p-1.5 text-teal-900 border border-teal-100">
                        <strong>Patient Directives:</strong> {appt.instructions}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div>
              <label className="label">Update Review Status</label>
              <select
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value as any)}
                className="input"
              >
                <option value="UNDER_REVIEW">Mark Under Review (Field verification in progress)</option>
                <option value="VERIFIED">Mark Verified (Outbreak / Case Confirmed)</option>
                <option value="RESOLVED">Mark Resolved (Intervention completed)</option>
              </select>
              {reviewStatus === 'VERIFIED' && (
                <div className="mt-2 rounded-lg bg-teal-50 border border-teal-200 p-2.5 text-xs text-teal-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                  <span>
                    <strong>Authority Scheduling Trigger:</strong> Marking verified allows the Health Authority to schedule an official doctor appointment and send consultation slips.
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-primary-200 bg-primary-50/60 p-3.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createHealthRecord}
                  onChange={(e) => setCreateHealthRecord(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900">
                    {selectedReport?.health_record_id
                      ? `Sync / Update Linked Health Record (#${selectedReport.health_record_id})`
                      : 'Add to Clinical Health Records'}
                  </span>
                  <p className="text-slate-600 mt-0.5">
                    {selectedReport?.health_record_id
                      ? 'A clinical surveillance record is already linked. Saving will update it without creating a duplicate.'
                      : 'Generate an official surveillance record with patient details, symptoms, and cases in the health records database.'}
                  </p>
                </div>
              </label>

              {createHealthRecord && (
                <div className="mt-3 grid grid-cols-2 gap-3 pt-3 border-t border-primary-200/60 text-xs">
                  <div>
                    <label className="label text-slate-700">Disease Diagnosis</label>
                    <select
                      value={recordDiseaseType}
                      onChange={(e) => setRecordDiseaseType(e.target.value)}
                      className="input text-xs"
                    >
                      <option value="ACUTE_DIARRHEA">Acute Diarrhea (ADD)</option>
                      <option value="CHOLERA">Cholera</option>
                      <option value="TYPHOID">Typhoid Fever</option>
                      <option value="GASTROENTERITIS">Gastroenteritis</option>
                      <option value="VIRAL_HEPATITIS">Viral Hepatitis</option>
                      <option value="DYSENTERY">Dysentery</option>
                      <option value="OTHER">Other Enteric Illness</option>
                    </select>
                  </div>
                  <div>
                    <label className="label text-slate-700">Clinical Severity</label>
                    <select
                      value={recordSeverity}
                      onChange={(e) => setRecordSeverity(e.target.value)}
                      className="input text-xs"
                    >
                      <option value="MILD">Mild</option>
                      <option value="MODERATE">Moderate</option>
                      <option value="SEVERE">Severe</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="label">Field Verification & Action Notes</label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter actions taken: e.g. Contacted household, distributed chlorine packets, advised boiling..."
                className="input"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReviewSubmit}
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Confirm Review'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
