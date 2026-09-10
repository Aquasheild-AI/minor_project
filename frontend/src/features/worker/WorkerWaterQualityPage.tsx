import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, Droplets } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, Pagination } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Drawer } from '@/components/ui/Drawer';
import { api } from '@/services/api';
import type { DatasetRecord } from '@/features/water-quality/WaterQualityPage';

const statusVariant: Record<string, 'low' | 'medium' | 'critical'> = {
  safe: 'low',
  warning: 'medium',
  unsafe: 'critical',
  critical: 'critical',
};

export function WorkerWaterQualityPage() {
  const [records, setRecords] = useState<DatasetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [districtSearch, setDistrictSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [waterSourceFilter, setWaterSourceFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  // Selected for View
  const [selectedRecord, setSelectedRecord] = useState<DatasetRecord | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getDatasetWaterQuality({
        page,
        limit: pageSize,
        district: districtSearch,
        status: statusFilter,
        month: monthFilter,
        water_source: waterSourceFilter,
      });
      setRecords(response.data);
      setTotal(response.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, districtSearch, statusFilter, monthFilter, waterSourceFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <PageHeader
        title="Water Quality Monitoring"
        subtitle="Record and monitor water-quality conditions (Waterborne Disease Dataset)."
        breadcrumb={['Home', 'Water Quality']}
        actions={<Link to="/worker/water-quality/add" className="btn-primary"><Plus className="h-4 w-4" /> Add Water Quality Record</Link>}
      />

      <div className="card mt-6 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search district..." 
              value={districtSearch} 
              onChange={(e) => { setDistrictSearch(e.target.value); setPage(1); }} 
              className="input pl-10" 
            />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input">
            <option value="">All Statuses</option>
            <option value="safe">Safe (WQI ≥ 70)</option>
            <option value="warning">Warning (WQI 50-69)</option>
            <option value="unsafe">Unsafe (WQI 25-49)</option>
            <option value="critical">Critical (WQI &lt; 25)</option>
          </select>
          <input 
              type="text" 
              placeholder="Filter by month (e.g. July)" 
              value={monthFilter} 
              onChange={(e) => { setMonthFilter(e.target.value); setPage(1); }} 
              className="input" 
            />
           <input 
              type="text" 
              placeholder="Filter by water source" 
              value={waterSourceFilter} 
              onChange={(e) => { setWaterSourceFilter(e.target.value); setPage(1); }} 
              className="input" 
            />
        </div>
      </div>

      <div className="card mt-4">
        {loading ? (
          <LoadingState />
        ) : records.length === 0 ? (
          <EmptyState icon={Droplets} title="No records found" message="No water quality records match your filters." action={null} />
        ) : (
          <>
            <Table
              columns={[
                { key: 'district', header: 'DISTRICT', render: (r: DatasetRecord) => <span className="font-medium text-slate-900">{r.district}</span> },
                { key: 'month', header: 'MONTH' },
                { key: 'ph', header: 'pH', render: (r: DatasetRecord) => <span className={r.ph < 6.5 || r.ph > 8.5 ? 'font-medium text-risk-medium' : ''}>{r.ph?.toFixed(2)}</span> },
                { key: 'turbidity', header: 'TURBIDITY (NTU)', render: (r: DatasetRecord) => <span className={r.turbidity > 5 ? 'font-medium text-risk-critical' : ''}>{r.turbidity?.toFixed(2)}</span> },
                { key: 'temperature', header: 'TEMP (°C)', render: (r: DatasetRecord) => <span>{r.temperature?.toFixed(1)}</span> },
                { key: 'tds', header: 'TDS (PPM)', render: (r: DatasetRecord) => <span className={r.tds > 500 ? 'font-medium text-risk-medium' : ''}>{r.tds?.toFixed(0)}</span> },
                { key: 'status', header: 'STATUS', render: (r: DatasetRecord) => <Badge variant={statusVariant[r.status] || 'low'}>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</Badge> },
                { key: 'actions', header: 'ACTIONS', render: (r: DatasetRecord) => <button onClick={() => setSelectedRecord(r)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-primary-600"><Eye className="h-4 w-4" /></button> },
              ]}
              data={records}
              rowKey={(r) => r.id}
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>

      <Drawer
        open={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="Water Quality Details"
      >
        {selectedRecord && (
          <div className="space-y-4">
             <div>
                <h4 className="text-sm font-semibold text-slate-500 mb-2">Location Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-slate-500">State:</div><div className="font-medium text-slate-900">{selectedRecord.state}</div>
                    <div className="text-slate-500">District:</div><div className="font-medium text-slate-900">{selectedRecord.district}</div>
                    <div className="text-slate-500">Region:</div><div className="font-medium text-slate-900">{selectedRecord.region}</div>
                    <div className="text-slate-500">Lat / Lng:</div><div className="font-medium text-slate-900">{selectedRecord.latitude?.toFixed(4)}, {selectedRecord.longitude?.toFixed(4)}</div>
                </div>
             </div>
             
             <div className="border-t border-slate-100 pt-4">
                <h4 className="text-sm font-semibold text-slate-500 mb-2">Source &amp; Condition</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-slate-500">Water Source:</div><div className="font-medium text-slate-900">{selectedRecord.waterSource}</div>
                    <div className="text-slate-500">Water Treatment:</div><div className="font-medium text-slate-900">{selectedRecord.waterTreatment}</div>
                    <div className="text-slate-500">Month:</div><div className="font-medium text-slate-900">{selectedRecord.month}</div>
                    <div className="text-slate-500">Flooding:</div><div className="font-medium text-slate-900">{selectedRecord.flooding}</div>
                </div>
             </div>

             <div className="border-t border-slate-100 pt-4">
                <h4 className="text-sm font-semibold text-slate-500 mb-2">Quality &amp; Environment</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-slate-500">WQI:</div><div className="font-medium text-slate-900">{selectedRecord.waterQualityIndex?.toFixed(2)}</div>
                    <div className="text-slate-500">Status:</div><div className="font-medium text-slate-900 capitalize">{selectedRecord.status}</div>
                    <div className="text-slate-500">Temperature:</div><div className="font-medium text-slate-900">{selectedRecord.temperature?.toFixed(1)} °C</div>
                    <div className="text-slate-500">Rainfall:</div><div className="font-medium text-slate-900">{selectedRecord.rainfall?.toFixed(1)} mm</div>
                    <div className="text-slate-500">Humidity:</div><div className="font-medium text-slate-900">{selectedRecord.humidity?.toFixed(1)}%</div>
                </div>
             </div>

             <div className="border-t border-slate-100 pt-4">
                <h4 className="text-sm font-semibold text-slate-500 mb-2">Detailed Metrics</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-slate-500">pH:</div><div className="font-medium text-slate-900">{selectedRecord.ph?.toFixed(2)}</div>
                    <div className="text-slate-500">Turbidity:</div><div className="font-medium text-slate-900">{selectedRecord.turbidity?.toFixed(2)} NTU</div>
                    <div className="text-slate-500">Dissolved Oxygen:</div><div className="font-medium text-slate-900">{selectedRecord.dissolvedOxygen?.toFixed(2)} mg/L</div>
                    <div className="text-slate-500">BOD:</div><div className="font-medium text-slate-900">{selectedRecord.bod?.toFixed(2)} mg/L</div>
                    <div className="text-slate-500">TDS:</div><div className="font-medium text-slate-900">{selectedRecord.tds?.toFixed(0)} mg/L</div>
                    <div className="text-slate-500">Nitrate:</div><div className="font-medium text-slate-900">{selectedRecord.nitrate?.toFixed(2)} mg/L</div>
                    <div className="text-slate-500">Fluoride:</div><div className="font-medium text-slate-900">{selectedRecord.fluoride?.toFixed(2)} mg/L</div>
                    <div className="text-slate-500">Arsenic:</div><div className="font-medium text-slate-900">{selectedRecord.arsenic?.toFixed(2)} µg/L</div>
                    <div className="text-slate-500">Fecal Coliform:</div><div className="font-medium text-slate-900">{selectedRecord.fecalColiform?.toFixed(0)} /100ml</div>
                    <div className="text-slate-500">Total Coliform:</div><div className="font-medium text-slate-900">{selectedRecord.totalColiform?.toFixed(0)} /100ml</div>
                </div>
             </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
