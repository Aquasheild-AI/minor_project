import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, MapPin, Calendar, HeartPulse, Users, Activity } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/services/api';
import { formatDate } from '@/utils/risk';
import type { HealthRecord } from '@/types';

export function HealthRecordDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit Modal State
  const [showEdit, setShowEdit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    suspectedCases: 1,
    severity: 'MODERATE',
    status: 'UNDER_TREATMENT',
    treatmentAdministered: '',
    notes: '',
  });

  const loadRecord = () => {
    if (!id) return;
    api.getHealthRecord(id).then((r) => {
      if (r) {
        setRecord(r);
        setEditForm({
          suspectedCases: r.suspectedCases || 1,
          severity: r.riskLevel === 'critical' ? 'CRITICAL' : r.riskLevel === 'high' ? 'SEVERE' : 'MODERATE',
          status: 'UNDER_TREATMENT',
          treatmentAdministered: r.treatment || '',
          notes: r.notes || '',
        });
      } else {
        setError(true);
      }
      setLoading(false);
    }).catch(() => {
      setError(true);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadRecord();
  }, [id]);

  const handleDelete = async () => {
    if (!record) return;
    setDeleting(true);
    try {
      await api.deleteHealthRecord(record.id);
      navigate('/health');
    } catch (e) {
      console.error('Failed to delete health record:', e);
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!record) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const updated = await api.updateHealthRecord(record.id, {
        suspected_cases: Number(editForm.suspectedCases) || 1,
        severity: editForm.severity,
        status: editForm.status,
        treatment_administered: editForm.treatmentAdministered,
        notes: editForm.notes,
      });
      setRecord(updated);
      setShowEdit(false);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update record.');
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) return <LoadingState message="Loading health surveillance record..." />;
  if (error || !record) return <ErrorState message="Health record not found." onRetry={() => navigate('/health')} />;

  return (
    <div>
      <PageHeader
        title="Health Record Details"
        breadcrumb={['Home', 'Health Surveillance', 'Record Details']}
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/health')} className="btn-secondary"><ArrowLeft className="h-4 w-4" /> Back</button>
            <button onClick={() => setShowEdit(true)} className="btn-secondary"><Pencil className="h-4 w-4" /> Edit Record</button>
            <button onClick={() => setShowDelete(true)} className="btn-danger"><Trash2 className="h-4 w-4" /> Delete</button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{record.villageName}</h3>
              <p className="text-sm text-slate-500">Record ID: {record.id}</p>
            </div>
            <RiskBadge level={record.riskLevel} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow icon={MapPin} label="Village" value={record.villageName} />
            <InfoRow icon={Calendar} label="Reporting Date" value={formatDate(record.reportingDate)} />
            <InfoRow icon={HeartPulse} label="Disease Category" value={record.diseaseCategory} />
            <InfoRow icon={Users} label="Suspected Cases" value={String(record.suspectedCases)} />
            <InfoRow icon={Users} label="Age Group" value={record.ageGroup} />
            <InfoRow icon={Activity} label="Reported By" value={record.reportedBy} />
          </div>

          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-slate-700">Symptoms</p>
            <div className="flex flex-wrap gap-2">
              {record.symptoms.map((s) => (
                <span key={s} className="badge bg-slate-100 text-slate-700">{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-slate-900">Record Timeline</h3>
          <div className="mt-4 space-y-4">
            <TimelineItem title="Record Created" date={record.reportingDate} description={`Logged by ${record.reportedBy}`} active />
            <TimelineItem title="Clinical Triage" date={record.reportingDate} description="Symptoms classified under surveillance rules." active />
            <TimelineItem title="Risk Evaluation" date={record.reportingDate} description={`Calculated severity status: ${record.riskLevel}`} active />
          </div>
        </div>
      </div>

      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Delete Health Record" size="sm">
        <p className="text-sm text-slate-600">
          Are you sure you want to delete this health record? This will permanently remove it from the surveillance database.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setShowDelete(false)} disabled={deleting} className="btn-secondary">Cancel</button>
          <button onClick={handleDelete} disabled={deleting} className="btn-danger">
            {deleting ? 'Deleting...' : 'Delete Record'}
          </button>
        </div>
      </Modal>

      {/* Edit Record Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Health Record" size="md">
        <div className="space-y-4">
          {editError && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-200">
              {editError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Suspected Cases</label>
              <input
                type="number"
                min={1}
                value={editForm.suspectedCases}
                onChange={(e) => setEditForm({ ...editForm, suspectedCases: parseInt(e.target.value) || 1 })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Severity</label>
              <select
                value={editForm.severity}
                onChange={(e) => setEditForm({ ...editForm, severity: e.target.value })}
                className="input"
              >
                <option value="MILD">Mild</option>
                <option value="MODERATE">Moderate</option>
                <option value="SEVERE">Severe</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Clinical Status</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              className="input"
            >
              <option value="UNDER_TREATMENT">Under Treatment</option>
              <option value="RECOVERED">Recovered</option>
              <option value="HOSPITALIZED">Hospitalized / Referred</option>
              <option value="DECEASED">Deceased</option>
            </select>
          </div>
          <div>
            <label className="label">Treatment Administered</label>
            <input
              type="text"
              value={editForm.treatmentAdministered}
              onChange={(e) => setEditForm({ ...editForm, treatmentAdministered: e.target.value })}
              placeholder="e.g. Oral Rehydration Solution (ORS), Zinc, Ciprofloxacin"
              className="input"
            />
          </div>
          <div>
            <label className="label">Clinical Notes</label>
            <textarea
              rows={3}
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              placeholder="Follow-up notes, patient observations..."
              className="input"
            />
          </div>
          <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button onClick={() => setShowEdit(false)} disabled={savingEdit} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleSaveEdit} disabled={savingEdit} className="btn-primary">
              {savingEdit ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function TimelineItem({ title, date, description, active }: { title: string; date: string; description: string; active?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`h-3 w-3 rounded-full ${active ? 'bg-primary-600' : 'bg-slate-300'}`} />
        <div className="mt-1 h-full w-px flex-1 bg-slate-200" />
      </div>
      <div className="pb-2">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="text-xs text-slate-400">{date}</p>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}
