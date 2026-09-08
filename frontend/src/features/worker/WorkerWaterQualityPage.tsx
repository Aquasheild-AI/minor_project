import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, Droplets, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Table, Pagination } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { workerApi } from '@/services/workerApi';
import { assignedVillages } from '@/data/workerData';
import { formatDate } from '@/utils/risk';
import type { WaterQualityRecord } from '@/types';

const statusVariant: Record<string, 'low' | 'medium' | 'critical'> = {
  safe: 'low',
  moderate: 'medium',
  unsafe: 'critical',
};

export function WorkerWaterQualityPage() {
  const [records, setRecords] = useState<WaterQualityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    workerApi.getWaterQuality().then((r) => {
      setRecords(r);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (search && !r.villageName.toLowerCase().includes(search.toLowerCase())) return false;
      if (villageFilter && r.villageId !== villageFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      return true;
    });
  }, [records, search, villageFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = {
    total: records.length,
    normal: records.filter((r) => r.status === 'safe').length,
    warning: records.filter((r) => r.status === 'moderate').length,
    critical: records.filter((r) => r.status === 'unsafe').length,
  };

  return (
    <div>
      <PageHeader
        title="Water Quality Monitoring"
        subtitle="Record and monitor water-quality conditions in assigned villages."
        breadcrumb={['Home', 'Water Quality']}
        actions={<Link to="/worker/water-quality/add" className="btn-primary"><Plus className="h-4 w-4" /> Add Water Quality Record</Link>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Samples Recorded" value={stats.total} icon={Droplets} iconColor="text-primary-600" iconBg="bg-primary-50" />
        <StatCard label="Normal Samples" value={stats.normal} icon={CheckCircle2} iconColor="text-risk-low" iconBg="bg-risk-low-bg" />
        <StatCard label="Warning Samples" value={stats.warning} icon={AlertCircle} iconColor="text-risk-medium" iconBg="bg-risk-medium-bg" />
        <StatCard label="Critical Samples" value={stats.critical} icon={AlertTriangle} iconColor="text-risk-critical" iconBg="bg-risk-critical-bg" />
      </div>

      <div className="card mt-6 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search village..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input pl-10" />
          </div>
          <select value={villageFilter} onChange={(e) => { setVillageFilter(e.target.value); setPage(1); }} className="input">
            <option value="">All Villages</option>
            {assignedVillages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input">
            <option value="">All Statuses</option>
            <option value="safe">Normal</option>
            <option value="moderate">Warning</option>
            <option value="unsafe">Critical</option>
          </select>
        </div>
      </div>

      <div className="card mt-4">
        {loading ? (
          <LoadingState />
        ) : paged.length === 0 ? (
          <EmptyState icon={Droplets} title="No water quality records found" message="No water quality records found for the selected filters." action={<Link to="/worker/water-quality/add" className="btn-primary"><Plus className="h-4 w-4" /> Add Record</Link>} />
        ) : (
          <>
            <Table
              columns={[
                { key: 'villageName', header: 'Village', render: (r: WaterQualityRecord) => <span className="font-medium text-slate-900">{r.villageName}</span> },
                { key: 'date', header: 'Date', render: (r: WaterQualityRecord) => formatDate(r.date) },
                { key: 'ph', header: 'pH', render: (r: WaterQualityRecord) => <span className={r.ph < 6.5 || r.ph > 8.5 ? 'font-medium text-risk-medium' : ''}>{r.ph}</span> },
                { key: 'turbidity', header: 'Turbidity (NTU)', render: (r: WaterQualityRecord) => <span className={r.turbidity > 5 ? 'font-medium text-risk-critical' : r.turbidity > 3 ? 'font-medium text-risk-medium' : ''}>{r.turbidity}</span> },
                { key: 'temperature', header: 'Temp (°C)' },
                { key: 'tds', header: 'TDS (ppm)', render: (r: WaterQualityRecord) => <span className={r.tds > 500 ? 'font-medium text-risk-medium' : ''}>{r.tds}</span> },
                { key: 'status', header: 'Water Status', render: (r: WaterQualityRecord) => <Badge variant={statusVariant[r.status]}>{r.status === 'safe' ? 'Normal' : r.status === 'moderate' ? 'Warning' : 'Critical'}</Badge> },
                { key: 'actions', header: 'Actions', render: () => <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-primary-600"><Eye className="h-4 w-4" /></button> },
              ]}
              data={paged}
              rowKey={(r) => r.id}
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
