import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, Droplets, Beaker, Activity, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Table, Pagination } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { api } from '@/services/api';
import { villages } from '@/data/mockData';
import type { WaterQualityRecord } from '@/types';

const statusVariant: Record<string, 'low' | 'medium' | 'critical'> = {
  safe: 'low',
  moderate: 'medium',
  unsafe: 'critical',
};

export function WaterQualityPage() {
  const [records, setRecords] = useState<WaterQualityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    api.getWaterQuality().then((r) => {
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

  const avg = (key: keyof WaterQualityRecord) =>
    records.length ? (records.reduce((s, r) => s + (r[key] as number), 0) / records.length).toFixed(1) : '0';

  const stats = {
    total: records.length,
    avgPh: avg('ph'),
    avgTds: Math.round(records.reduce((s, r) => s + r.tds, 0) / Math.max(records.length, 1)),
    highTurbidity: records.filter((r) => r.turbidity > 5).length,
  };

  return (
    <div>
      <PageHeader
        title="Water Quality Monitoring"
        subtitle="Track water quality samples across monitored villages."
        breadcrumb={['Home', 'Water Quality']}
        actions={<Link to="/water-quality/add" className="btn-primary"><Plus className="h-4 w-4" /> Add Water Quality Record</Link>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Samples Recorded" value={stats.total} icon={Droplets} iconColor="text-primary-600" iconBg="bg-primary-50" />
        <StatCard label="Average pH" value={stats.avgPh} icon={Beaker} iconColor="text-primary-600" iconBg="bg-primary-50" />
        <StatCard label="Average TDS" value={`${stats.avgTds} ppm`} icon={Activity} iconColor="text-primary-600" iconBg="bg-primary-50" />
        <StatCard label="High Turbidity Samples" value={stats.highTurbidity} icon={AlertTriangle} iconColor="text-risk-high" iconBg="bg-risk-high-bg" />
      </div>

      <div className="card mt-6 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search village..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input pl-10" />
          </div>
          <select value={villageFilter} onChange={(e) => { setVillageFilter(e.target.value); setPage(1); }} className="input">
            <option value="">All Villages</option>
            {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input">
            <option value="">All Statuses</option>
            <option value="safe">Safe</option>
            <option value="moderate">Moderate</option>
            <option value="unsafe">Unsafe</option>
          </select>
        </div>
      </div>

      <div className="card mt-4">
        {loading ? (
          <LoadingState />
        ) : paged.length === 0 ? (
          <EmptyState icon={Droplets} title="No water quality records found" message="No water quality records found for the selected filters." action={<Link to="/water-quality/add" className="btn-primary"><Plus className="h-4 w-4" /> Add Record</Link>} />
        ) : (
          <>
            <Table
              columns={[
                { key: 'villageName', header: 'Village', render: (r: WaterQualityRecord) => <span className="font-medium text-slate-900">{r.villageName}</span> },
                { key: 'date', header: 'Date' },
                { key: 'ph', header: 'pH', render: (r: WaterQualityRecord) => <span className={r.ph < 6.5 || r.ph > 8.5 ? 'font-medium text-risk-medium' : ''}>{r.ph}</span> },
                { key: 'turbidity', header: 'Turbidity (NTU)', render: (r: WaterQualityRecord) => <span className={r.turbidity > 5 ? 'font-medium text-risk-critical' : ''}>{r.turbidity}</span> },
                { key: 'temperature', header: 'Temp (°C)' },
                { key: 'tds', header: 'TDS (ppm)', render: (r: WaterQualityRecord) => <span className={r.tds > 500 ? 'font-medium text-risk-medium' : ''}>{r.tds}</span> },
                { key: 'status', header: 'Status', render: (r: WaterQualityRecord) => <Badge variant={statusVariant[r.status]}>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</Badge> },
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
