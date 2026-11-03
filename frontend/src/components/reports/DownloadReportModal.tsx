import { useState, useMemo } from 'react';
import { FileText, Printer, ShieldAlert, CheckCircle2, Users, HeartPulse } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { printHealthRecordsReport, printCommunityReportsList } from '@/utils/reportExport';
import type { HealthRecord, Village } from '@/types';
import type { CommunityReport } from '@/services/communityApi';

interface DownloadReportModalProps {
  open: boolean;
  onClose: () => void;
  records?: HealthRecord[];
  communityReports?: CommunityReport[];
  village?: Village | null;
  title?: string;
}

export function DownloadReportModal({
  open,
  onClose,
  records = [],
  communityReports = [],
  village = null,
  title = 'Download Health Record Report (PDF)',
}: DownloadReportModalProps) {
  const hasCommunity = communityReports && communityReports.length > 0;
  const hasClinical = records && records.length > 0;

  // Selected report type if both are provided
  const [reportType, setReportType] = useState<'community' | 'clinical'>(
    hasCommunity && !hasClinical ? 'community' : 'clinical'
  );

  const effectiveRecords: HealthRecord[] = useMemo(() => {
    if (records && records.length > 0) return records;
    if (!village) return [];
    const cases = Number(village.suspectedCases) || 1;
    return [
      {
        id: `HR-${village.id || '01'}-001`,
        villageId: String(village.id),
        villageName: village.name,
        reportingDate: (village.lastUpdated || new Date().toISOString()).split('T')[0],
        diseaseCategory: (village.riskLevel === 'critical' ? 'Cholera' : village.riskLevel === 'high' ? 'Typhoid' : 'Diarrheal Disease') as any,
        suspectedCases: cases,
        symptoms: ['Fever', 'Diarrhea', 'Dehydration'] as any,
        ageGroup: '19-40',
        riskLevel: village.riskLevel || 'medium',
        status: 'Active',
        reportedBy: 'District Health Society / PHC',
      },
    ];
  }, [records, village]);

  const totalCases = effectiveRecords.reduce((s, r) => s + (r.suspectedCases || 1), 0);
  const criticalCount = effectiveRecords.filter((r) => r.riskLevel === 'critical' || r.riskLevel === 'high').length;

  const handleDownloadPDF = () => {
    if (reportType === 'community' && hasCommunity) {
      const reportTitle = village
        ? `${village.name} - Citizen Health Issues Dossier`
        : 'Citizen Health Incident & Surveillance Dossier';
      printCommunityReportsList(communityReports, reportTitle);
    } else {
      const reportTitle = village
        ? `${village.name} Village Health Surveillance Dossier`
        : 'District Epidemiological Surveillance Report';
      printHealthRecordsReport(effectiveRecords, reportTitle);
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="space-y-5">
        {/* Toggle options if both Citizen Reports and Clinical Records exist */}
        {hasCommunity && hasClinical && (
          <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setReportType('community')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all inline-flex items-center justify-center gap-1.5 ${
                reportType === 'community'
                  ? 'bg-white text-primary-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Citizen Reports ({communityReports.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setReportType('clinical')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all inline-flex items-center justify-center gap-1.5 ${
                reportType === 'clinical'
                  ? 'bg-white text-primary-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HeartPulse className="h-3.5 w-3.5" />
              <span>Surveillance Records ({effectiveRecords.length})</span>
            </button>
          </div>
        )}

        {/* Summary Card */}
        <div className="rounded-xl border border-primary-100 bg-primary-50/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-primary-950">
                {reportType === 'community' && hasCommunity
                  ? 'Citizen-Reported Health Incidents'
                  : village
                  ? `${village.name} Health Surveillance Data`
                  : 'Epidemiological Surveillance Case Data'}
              </h4>
              <p className="mt-0.5 text-xs text-primary-700">
                {reportType === 'community' && hasCommunity
                  ? 'Contains direct user-entered details: symptoms, notes, water source, and affected counts.'
                  : village
                  ? `Clinical records for ${village.name}, ${village.district}`
                  : 'Official surveillance records across monitored health centres.'}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-1 text-xs font-bold text-primary-800">
                {reportType === 'community' && hasCommunity
                  ? `${communityReports.length} ${communityReports.length === 1 ? 'Report' : 'Reports'}`
                  : `${effectiveRecords.length} ${effectiveRecords.length === 1 ? 'Record' : 'Records'}`}
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-primary-200/60 pt-3 text-xs">
            <div>
              <span className="text-slate-500">
                {reportType === 'community' && hasCommunity ? 'Incidents Logged:' : 'Reported Cases:'}
              </span>{' '}
              <span className="font-semibold text-slate-800">
                {reportType === 'community' && hasCommunity ? communityReports.length : totalCases}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-risk-high" />
              <span className="text-slate-500">
                {reportType === 'community' && hasCommunity ? 'Awaiting Review:' : 'High / Critical Cases:'}
              </span>{' '}
              <span className="font-semibold text-risk-critical">
                {reportType === 'community' && hasCommunity
                  ? communityReports.filter((r) => r.status === 'submitted' || r.status === 'under_review').length
                  : criticalCount}
              </span>
            </div>
          </div>
        </div>

        {/* PDF Document Preview Card */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <FileText className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h5 className="text-sm font-bold text-slate-900">
                  {reportType === 'community' && hasCommunity
                    ? 'Citizen Field Dossier (PDF)'
                    : 'Official Public Health Dossier (PDF)'}
                </h5>
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-700">
                  PDF
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                {reportType === 'community' && hasCommunity
                  ? 'Includes verbatim citizen observations, symptom tags, number of people affected, age demographic, and public health water guidelines.'
                  : 'Includes executive metrics, disease categorization, patient vulnerability tiers, clinical notes, and official health agency header.'}
              </p>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Print-Ready Format
                </span>
                <span>•</span>
                <span>A4 Document</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={reportType === 'community' ? communityReports.length === 0 : effectiveRecords.length === 0}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2"
          >
            <Printer className="h-4 w-4" />
            <span>Download / Print PDF</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
