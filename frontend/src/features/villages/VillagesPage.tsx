import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, MapPin } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, Pagination } from '@/components/ui/Table';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Modal } from '@/components/ui/Modal';
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

  // Add / Edit Village Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editVillage, setEditVillage] = useState<Village | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    district: 'Varanasi',
    state: 'Uttar Pradesh',
    population: '2500',
    lat: '25.3176',
    lng: '82.9739',
  });

  const loadVillages = () => {
    setLoading(true);
    api.getVillages().then((v) => {
      setVillages(v);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadVillages();
  }, []);

  const openAdd = () => {
    setForm({
      name: '',
      district: 'Varanasi',
      state: 'Uttar Pradesh',
      population: '2500',
      lat: '25.3176',
      lng: '82.9739',
    });
    setModalError(null);
    setShowAddModal(true);
  };

  const openEdit = (v: Village, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditVillage(v);
    setForm({
      name: v.name,
      district: v.district,
      state: v.state,
      population: String(v.population),
      lat: String(v.lat),
      lng: String(v.lng),
    });
    setModalError(null);
  };

  const handleSaveVillage = async (isEdit: boolean) => {
    if (!form.name.trim() || !form.district.trim()) {
      setModalError('Village name and district are required.');
      return;
    }

    setSubmitting(true);
    setModalError(null);

    try {
      if (isEdit && editVillage) {
        await api.updateVillage(editVillage.id, {
          name: form.name.trim(),
          district: form.district.trim(),
          state: form.state.trim(),
          population: Number(form.population) || 1000,
          lat: parseFloat(form.lat) || 25.3176,
          lng: parseFloat(form.lng) || 82.9739,
        });
        setEditVillage(null);
      } else {
        await api.createVillage({
          name: form.name.trim(),
          district: form.district.trim(),
          state: form.state.trim(),
          population: Number(form.population) || 1000,
          lat: parseFloat(form.lat) || 25.3176,
          lng: parseFloat(form.lng) || 82.9739,
        });
        setShowAddModal(false);
      }
      loadVillages();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save village.');
    } finally {
      setSubmitting(false);
    }
  };

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
        actions={
          <button onClick={openAdd} className="btn-primary">
            <Plus className="h-4 w-4" /> Add Village
          </button>
        }
      />

      <div className="card mb-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search village or district..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-10"
          />
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
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/villages/${v.id}`); }}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-primary-600"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => openEdit(v, e)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-primary-600"
                        title="Edit Village"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
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

      {/* Add / Edit Village Modal */}
      {(showAddModal || editVillage) && (
        <Modal
          open={true}
          onClose={() => { setShowAddModal(false); setEditVillage(null); }}
          title={editVillage ? `Edit Village: ${editVillage.name}` : 'Register New Village'}
        >
          <div className="space-y-4">
            {modalError && (
              <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-200">
                {modalError}
              </div>
            )}
            <div>
              <label className="label">Village Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Rampur"
                className="input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">District *</label>
                <input
                  type="text"
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                  placeholder="e.g. Varanasi"
                  className="input"
                />
              </div>
              <div>
                <label className="label">State</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="e.g. Uttar Pradesh"
                  className="input"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Population</label>
                <input
                  type="number"
                  value={form.population}
                  onChange={(e) => setForm({ ...form, population: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Latitude</label>
                <input
                  type="text"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Longitude</label>
                <input
                  type="text"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setEditVillage(null); }}
                className="btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveVillage(Boolean(editVillage))}
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : editVillage ? 'Update Village' : 'Add Village'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
