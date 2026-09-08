import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, MapPin } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, Pagination } from '@/components/ui/Table';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { api } from '@/services/api';
import { timeAgo } from '@/utils/risk';
import type { Village } from '@/types';

const waterStatusVariant: Record<string, 'low' | 'medium' | 'critical'> = {
  safe: 'low',
  moderate: 'medium',
  unsafe: 'critical',
};

export function VillagesPage() {
  const navigate = useNavigate();
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    api.getVillages().then((v) => {
      setVillages(v);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return villages.filter((v) =>
      !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.district.toLowerCase().includes(search.toLowerCase())
    );
  }, [villages, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <PageHeader
        title="Villages"
        subtitle="Manage and monitor all villages under surveillance."
        breadcrumb={['Home', 'Villages']}
        actions={<button className="btn-primary"><Plus className="h-4 w-4" /> Add Village</button>}
      />

      <div className="card mb-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search village or district..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input pl-10" />
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
                { key: 'population', header: 'Population', render: (v: Village) => v.population.toLocaleString() },
                { key: 'riskLevel', header: 'Current Risk', render: (v: Village) => <RiskBadge level={v.riskLevel} /> },
                { key: 'suspectedCases', header: 'Cases', render: (v: Village) => <span className="font-semibold">{v.suspectedCases}</span> },
                { key: 'waterStatus', header: 'Water Status', render: (v: Village) => <Badge variant={waterStatusVariant[v.waterStatus]}>{v.waterStatus.charAt(0).toUpperCase() + v.waterStatus.slice(1)}</Badge> },
                { key: 'lastUpdated', header: 'Last Updated', render: (v: Village) => <span className="text-xs text-slate-400">{timeAgo(v.lastUpdated)}</span> },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (v: Village) => (
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/villages/${v.id}`)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-primary-600" title="View"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => navigate(`/villages/${v.id}`)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-primary-600" title="Edit"><Pencil className="h-4 w-4" /></button>
                    </div>
                  ),
                },
              ]}
              data={paged}
              rowKey={(v) => v.id}
              onRowClick={(v) => navigate(`/villages/${v.id}`)}
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
