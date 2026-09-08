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

  useEffect(() => {
    api.getHealthRecords().then((records) => {
      const r = records.find((rec) => rec.id === id);
      if (r) setRecord(r);
      else setError(true);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <LoadingState />;
  if (error || !record) return <ErrorState message="Health record not found." onRetry={() => navigate('/health')} />;

  return (
    <div>
      <PageHeader
        title="Health Record Details"
        breadcrumb={['Home', 'Health Surveillance', 'Record Details']}
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/health')} className="btn-secondary"><ArrowLeft className="h-4 w-4" /> Back</button>
            <Link to="/health" className="btn-secondary"><Pencil className="h-4 w-4" /> Edit</Link>
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
            <TimelineItem title="Record Created" date={record.reportingDate} description="Health record submitted by health worker." active />
            <TimelineItem title="Under Review" date="2026-08-19" description="Record flagged for risk assessment." />
            <TimelineItem title="Risk Assessment" date="2026-08-20" description={`Risk level determined: ${record.riskLevel}`} />
          </div>
        </div>
      </div>

      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Delete Health Record" size="sm">
        <p className="text-sm text-slate-600">
          Are you sure you want to delete this health record? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setShowDelete(false)} className="btn-secondary">Cancel</button>
          <button onClick={() => navigate('/health')} className="btn-danger">Delete Record</button>
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
