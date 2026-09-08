import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, MapPin } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, Pagination } from '@/components/ui/Table';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { workerApi } from '@/services/workerApi';
import { timeAgo } from '@/utils/risk';
import type { Village } from '@/types';

const waterStatusVariant: Record<string, 'low' | 'medium' | 'critical'> = {
  safe: 'low',
  moderate: 'medium',
  unsafe: 'critical',
};

export function WorkerVillagesPage() {
  const navigate = useNavigate();
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    workerApi.getVillages().then((v) => {
      setVillages(v);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return villages.filter((v) => {
      if (search && !v.name.toLowerCase().includes(search.toLowerCase()) && !v.district.toLowerCase().includes(search.toLowerCase())) return false;
      if (riskFilter && v.riskLevel !== riskFilter) return false;
      return true;
    });
  }, [villages, search, riskFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <PageHeader title="My Villages" subtitle="Villages assigned to you for monitoring and surveillance." breadcrumb={['Home', 'My Villages']} />

      <div className="card mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search village or district..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input pl-10" />
          </div>
          <select value={riskFilter} onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }} className="input">
            <option value="">All Risk Levels</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <LoadingState />
        ) : paged.length === 0 ? (
          <EmptyState icon={MapPin} title="No villages found" message="No villages match your search. Try a different search term." />
        ) : (
          <>
            <Table
              columns={[
                { key: 'name', header: 'Village', render: (v: Village) => <span className="font-medium text-slate-900">{v.name}</span> },
                { key: 'district', header: 'District', render: (v: Village) => `${v.district}, ${v.state}` },
                { key: 'riskLevel', header: 'Current Risk', render: (v: Village) => <RiskBadge level={v.riskLevel} /> },
                { key: 'riskScore', header: 'Risk Score', render: (v: Village) => <span className="font-semibold" style={{ color: v.riskLevel === 'critical' ? '#dc2626' : v.riskLevel === 'high' ? '#ea580c' : v.riskLevel === 'medium' ? '#d97706' : '#16a34a' }}>{v.riskScore}%</span> },
                { key: 'suspectedCases', header: 'Cases', render: (v: Village) => <span className="font-semibold">{v.suspectedCases}</span> },
                { key: 'waterStatus', header: 'Water Status', render: (v: Village) => <Badge variant={waterStatusVariant[v.waterStatus]}>{v.waterStatus.charAt(0).toUpperCase() + v.waterStatus.slice(1)}</Badge> },
                { key: 'lastUpdated', header: 'Last Updated', render: (v: Village) => <span className="text-xs text-slate-400">{timeAgo(v.lastUpdated)}</span> },
                {
                  key: 'actions',
                  header: 'Action',
                  render: (v: Village) => (
                    <button onClick={() => navigate(`/worker/villages/${v.id}`)} className="btn-secondary px-3 py-1 text-xs">
                      <Eye className="h-3.5 w-3.5" /> View
                    </button>
                  ),
                },
              ]}
              data={paged}
              rowKey={(v) => v.id}
              onRowClick={(v) => navigate(`/worker/villages/${v.id}`)}
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
