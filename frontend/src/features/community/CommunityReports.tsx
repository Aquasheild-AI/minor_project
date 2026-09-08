import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { communityApi } from '@/services/communityApi';
import { formatDate } from '@/utils/risk';
import type { CommunityReport } from '@/data/communityData';

const statusVariant: Record<string, 'low' | 'medium' | 'info'> = {
  submitted: 'info',
  under_review: 'medium',
  reviewed: 'low',
};
const statusLabel: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  reviewed: 'Reviewed',
};

export function CommunityReports() {
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    communityApi.getReports().then((r) => {
      setReports(r);
      setLoading(false);
    });
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Track your submitted health reports.</p>
        </div>
        <Link to="/community/report" className="btn-primary">
          <Plus className="h-4 w-4" /> New Report
        </Link>
      </div>

      {loading ? (
        <LoadingState />
      ) : reports.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FileText}
            title="No Health Reports"
            message="You have not submitted any health reports yet."
            action={<Link to="/community/report" className="btn-primary"><Plus className="h-4 w-4" /> Report a Health Issue</Link>}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50">
                    <FileText className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{r.villageName}</p>
                      <Badge variant={statusVariant[r.status]}>{statusLabel[r.status]}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Symptoms: {r.symptoms.join(', ')}
                    </p>
                    <p className="text-xs text-slate-500">
                      People affected: {r.peopleAffected}{r.ageGroup ? ` · Age: ${r.ageGroup}` : ''}
                    </p>
                    {r.notes && <p className="mt-1 text-xs text-slate-400">{r.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(r.date)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
