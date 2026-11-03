import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Calendar, Printer } from 'lucide-react';
import { printSingleCommunityReport, printCommunityReportsList } from '@/utils/reportExport';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { communityApi, type CommunityReport } from '@/services/communityApi';
import { formatDate } from '@/utils/risk';
import { useTranslation } from 'react-i18next';

const statusVariant: Record<string, 'low' | 'medium' | 'info'> = {
  submitted: 'info',
  under_review: 'medium',
  reviewed: 'low',
};

export function CommunityReports() {
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation();
  const isHi = i18n.language?.startsWith('hi');

  const statusLabel: Record<string, string> = {
    submitted: isHi ? 'प्रस्तुत' : 'Submitted',
    under_review: isHi ? 'समीक्षाधीन' : 'Under Review',
    reviewed: isHi ? 'समीक्षित' : 'Reviewed',
  };

  useEffect(() => {
    communityApi.getReports().then((r) => {
      setReports(r);
      setLoading(false);
    });
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('community.myReports.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('community.myReports.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2.5">
          {reports.length > 0 && (
            <button
              type="button"
              onClick={() => printCommunityReportsList(reports, isHi ? 'मेरे नागरिक स्वास्थ्य रिपोर्ट' : 'My Submitted Health Reports')}
              className="btn-secondary inline-flex items-center gap-1.5"
              title={isHi ? 'सभी रिपोर्ट की पीडीएफ फाइल डाउनलोड करें' : 'Download consolidated PDF of all reports'}
            >
              <Printer className="h-4 w-4 text-primary-600" />
              <span>{isHi ? 'सभी रिपोर्ट डाउनलोड करें (PDF)' : 'Download All (PDF)'}</span>
            </button>
          )}
          <Link to="/community/report" className="btn-primary inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> {isHi ? 'नई रिपोर्ट दर्ज करें' : 'New Report'}
          </Link>
        </div>
      </div>

      {loading ? (
        <LoadingState message={t('common.states.loading')} />
      ) : reports.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FileText}
            title={t('community.myReports.title')}
            message={t('community.myReports.noReports')}
            action={<Link to="/community/report" className="btn-primary"><Plus className="h-4 w-4" /> {t('community.reportIssue.title')}</Link>}
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
                      <Badge variant={statusVariant[r.status]}>{statusLabel[r.status] || r.status}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {isHi ? 'लक्षण' : 'Symptoms'}: {r.symptoms.join(', ')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isHi ? 'प्रभावित लोग' : 'People affected'}: {r.peopleAffected}{r.ageGroup ? ` · ${isHi ? 'आयु' : 'Age'}: ${r.ageGroup}` : ''}
                    </p>
                    {r.notes && <p className="mt-1 text-xs text-slate-400">{r.notes}</p>}
                  </div>
                </div>
                <div className="flex flex-col sm:items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(r.date)}
                  </div>
                  <button
                    type="button"
                    onClick={() => printSingleCommunityReport(r)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50/70 px-3 py-1.5 text-xs font-semibold text-primary-800 hover:bg-primary-100 transition-colors shadow-2xs"
                    title={isHi ? 'इस रिपोर्ट का पीडीएफ विवरण डाउनलोड करें' : 'Download official PDF dossier for this incident'}
                  >
                    <Printer className="h-3.5 w-3.5 text-primary-700" />
                    <span>{isHi ? 'पीडीएफ डाउनलोड' : 'Download PDF'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
