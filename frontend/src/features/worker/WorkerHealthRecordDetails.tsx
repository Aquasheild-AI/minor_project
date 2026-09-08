import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, MapPin, Calendar, HeartPulse, Users, Activity, User } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { workerApi } from '@/services/workerApi';
import { formatDate, formatDateTime } from '@/utils/risk';
import { healthWorker } from '@/data/workerData';
import type { HealthRecord } from '@/types';

export function WorkerHealthRecordDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    workerApi.getHealthRecords().then((records) => {
      const r = records.find((rec) => rec.id === id);
      if (r) setRecord(r);
      else setError(true);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <LoadingState />;
  if (error || !record) return <ErrorState message="Health record not found." onRetry={() => navigate('/worker/health')} />;

  return (
    <div>
      <PageHeader
        title="Health Record Details"
        breadcrumb={['Home', 'Health Records', 'Record Details']}
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/worker/health')} className="btn-secondary"><ArrowLeft className="h-4 w-4" /> Back to Health Records</button>
            <button onClick={() => navigate('/worker/health')} className="btn-secondary"><Pencil className="h-4 w-4" /> Edit Record</button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Report Information */}
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

        {/* Reporting Information */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-slate-900">Reporting Information</h3>
          <div className="mt-4 space-y-4">
            <InfoRow icon={User} label="Reported By" value={healthWorker.name} />
            <div>
              <p className="text-xs text-slate-500">Role</p>
              <p className="text-sm font-medium text-slate-900">{healthWorker.role}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Reported At</p>
              <p className="text-sm font-medium text-slate-900">{formatDateTime(record.reportingDate)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <div className="mt-1"><Badge variant="low">Submitted</Badge></div>
            </div>
          </div>
        </div>
      </div>
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
