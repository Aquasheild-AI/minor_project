import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Trash2, HeartPulse, FileText, AlertTriangle, CalendarDays } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Table, Pagination } from '@/components/ui/Table';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/services/api';
import { villages } from '@/data/mockData';
import type { HealthRecord, DiseaseCategory, RiskLevel } from '@/types';

const diseases: DiseaseCategory[] = ['Cholera', 'Typhoid', 'Dysentery', 'Hepatitis', 'Diarrheal Disease', 'Other'];

export function HealthRecordsPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const [diseaseFilter, setDiseaseFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<HealthRecord | null>(null);
  const pageSize = 10;

  useEffect(() => {
    api.getHealthRecords().then((r) => {
      setRecords(r);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (search && !r.villageName.toLowerCase().includes(search.toLowerCase())) return false;
      if (villageFilter && r.villageId !== villageFilter) return false;
      if (diseaseFilter && r.diseaseCategory !== diseaseFilter) return false;
      if (riskFilter && r.riskLevel !== riskFilter) return false;
      return true;
    });
  }, [records, search, villageFilter, diseaseFilter, riskFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = {
    total: records.length,
    suspected: records.reduce((s, r) => s + r.suspectedCases, 0),
    highRisk: records.filter((r) => r.riskLevel === 'high' || r.riskLevel === 'critical').length,
    thisWeek: records.filter((r) => r.reportingDate >= '2026-08-14').length,
  };

  return (
    <div>
      <PageHeader
        title="Health Surveillance"
        subtitle="Track and manage community health records across monitored villages."
        breadcrumb={['Home', 'Health Surveillance']}
        actions={
          <Link to="/health/add" className="btn-primary">
            <Plus className="h-4 w-4" /> Add Health Record
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Records" value={stats.total} icon={FileText} iconColor="text-primary-600" iconBg="bg-primary-50" />
        <StatCard label="Suspected Cases" value={stats.suspected} icon={HeartPulse} iconColor="text-primary-600" iconBg="bg-primary-50" />
        <StatCard label="High-Risk Reports" value={stats.highRisk} icon={AlertTriangle} iconColor="text-risk-high" iconBg="bg-risk-high-bg" />
        <StatCard label="Reports This Week" value={stats.thisWeek} icon={CalendarDays} iconColor="text-primary-600" iconBg="bg-primary-50" />
      </div>

      {/* Filters */}
      <div className="card mt-6 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search village..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input pl-10"
            />
          </div>
          <select value={villageFilter} onChange={(e) => { setVillageFilter(e.target.value); setPage(1); }} className="input">
            <option value="">All Villages</option>
            {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <select value={diseaseFilter} onChange={(e) => { setDiseaseFilter(e.target.value); setPage(1); }} className="input">
            <option value="">All Diseases</option>
            {diseases.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={riskFilter} onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }} className="input">
            <option value="">All Risk Levels</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card mt-4">
        {loading ? (
          <LoadingState />
        ) : paged.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No health records found"
            message="No health records found for the selected filters. Try adjusting your search criteria."
            action={<Link to="/health/add" className="btn-primary"><Plus className="h-4 w-4" /> Add Health Record</Link>}
          />
        ) : (
          <>
            <Table
              columns={[
                { key: 'villageName', header: 'Village', render: (r: HealthRecord) => <span className="font-medium text-slate-900">{r.villageName}</span> },
                { key: 'reportingDate', header: 'Date' },
                { key: 'diseaseCategory', header: 'Disease' },
                { key: 'suspectedCases', header: 'Cases', render: (r: HealthRecord) => <span className="font-semibold">{r.suspectedCases}</span> },
                { key: 'symptoms', header: 'Symptoms', render: (r: HealthRecord) => <span className="text-xs text-slate-500">{r.symptoms.join(', ')}</span> },
                { key: 'ageGroup', header: 'Age Group' },
                { key: 'riskLevel', header: 'Risk', render: (r: HealthRecord) => <RiskBadge level={r.riskLevel} /> },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (r: HealthRecord) => (
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/health/${r.id}`)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-primary-600" title="View"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => navigate(`/health/${r.id}`)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-primary-600" title="Edit"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteTarget(r)} className="rounded-lg p-1.5 text-slate-500 hover:bg-risk-critical-bg hover:text-risk-critical" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ),
                },
              ]}
              data={paged}
              rowKey={(r) => r.id}
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Delete confirmation */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Health Record" size="sm">
        <p className="text-sm text-slate-600">
          Are you sure you want to delete this health record for <span className="font-semibold">{deleteTarget?.villageName}</span>?
          This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setDeleteTarget(null)} className="btn-secondary">Cancel</button>
          <button
            onClick={() => {
              setRecords(records.filter((r) => r.id !== deleteTarget?.id));
              setDeleteTarget(null);
            }}
            className="btn-danger"
          >
            Delete Record
          </button>
        </div>
      </Modal>
    </div>
  );
}
