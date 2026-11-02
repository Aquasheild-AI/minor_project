import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  UserX,
  UserCheck,
  Users,
  Shield,
  HeartPulse,
  AlertCircle,
  MapPin,
  Building2,
  Phone,
  Mail,
  CheckCircle2,
  Lock,
  Download,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Modal } from '@/components/ui/Modal';
import { DownloadReportModal } from '@/components/reports/DownloadReportModal';
import { authGet, authPost, authPatch } from '@/services/authFetch';
import { api } from '@/services/api';
import { communityApi, type CommunityReport } from '@/services/communityApi';
import type { Village, HealthRecord } from '@/types';

interface DjangoUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone?: string;
  organization?: string;
  is_active?: boolean;
  assigned_villages?: number[];
  assigned_villages_list?: { id: number; name: string; district: string }[];
  village?: number;
  village_name?: string;
  preferred_language?: string;
  notification_alerts?: boolean;
}

export interface AdminUser {
  id: string;
  djangoId: number;
  username: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organization: string;
  role: 'Health Worker' | 'Authority' | 'Admin';
  rawRole: string;
  status: 'active' | 'disabled';
  assignedVillages: number[];
  assignedVillagesList: { id: number; name: string; district: string }[];
  preferredLanguage?: string;
  notificationAlerts?: boolean;
}

const roleIcon: Record<string, React.ElementType> = {
  Admin: Shield,
  AUTHORITY: Shield,
  'Health Worker': HeartPulse,
  HEALTH_WORKER: HeartPulse,
  Authority: Users,
  COMMUNITY: Users,
};

export function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [villagesList, setVillagesList] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'HEALTH_WORKER' | 'AUTHORITY'>('ALL');

  // Create Health Worker Modal State
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    organization: '',
    assignedVillages: [] as number[],
  });

  // See / View Health Worker Details Modal State
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);

  // Edit Health Worker Details Modal State
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    organization: '',
    assignedVillages: [] as number[],
    password: '',
    isActive: true,
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Health Records Report Download State
  const [showHealthReportModal, setShowHealthReportModal] = useState(false);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [communityReports, setCommunityReports] = useState<CommunityReport[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  const handleOpenHealthReport = async () => {
    setShowHealthReportModal(true);
    if (healthRecords.length === 0 || communityReports.length === 0) {
      setLoadingReport(true);
      try {
        const [records, cReports] = await Promise.all([
          api.getHealthRecords().catch(() => []),
          communityApi.getReports().catch(() => []),
        ]);
        setHealthRecords(records);
        setCommunityReports(cReports);
      } catch (err) {
        console.error('Failed to fetch records for report', err);
      } finally {
        setLoadingReport(false);
      }
    }
  };

  // Feedback Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadUsersAndVillages = async () => {
    setLoading(true);
    try {
      const [usersData, villagesData] = await Promise.all([
        authGet<DjangoUser[]>('/api/manage/users/'),
        api.getVillages().catch(() => [] as Village[]),
      ]);

      setVillagesList(villagesData);

      const mappedUsers: AdminUser[] = usersData.map((u) => {
        const assignedIds = Array.isArray(u.assigned_villages) ? u.assigned_villages : [];
        const assignedList = u.assigned_villages_list || [];

        return {
          id: String(u.id),
          djangoId: u.id,
          username: u.username,
          name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username,
          firstName: u.first_name || '',
          lastName: u.last_name || '',
          email: u.email || `${u.username}@system.local`,
          phone: u.phone || '',
          organization: u.organization || '',
          role: u.role === 'HEALTH_WORKER' ? 'Health Worker' : u.role === 'AUTHORITY' ? 'Authority' : 'Admin',
          rawRole: u.role,
          status: u.is_active === false ? 'disabled' : 'active',
          assignedVillages: assignedIds,
          assignedVillagesList: assignedList,
          preferredLanguage: u.preferred_language,
          notificationAlerts: u.notification_alerts,
        };
      });

      setUsers(mappedUsers);
    } catch (err) {
      console.error('Failed to load users or villages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersAndVillages();
  }, []);

  const filtered = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.organization.toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      roleFilter === 'ALL' ||
      (roleFilter === 'HEALTH_WORKER' && u.rawRole === 'HEALTH_WORKER') ||
      (roleFilter === 'AUTHORITY' && u.rawRole === 'AUTHORITY');

    return matchesSearch && matchesRole;
  });

  const toggleStatus = async (user: AdminUser) => {
    try {
      const updatedUser: DjangoUser = await authPatch(`/api/manage/users/${user.djangoId}/toggle/`, {});
      const newStatus = updatedUser.is_active === false ? 'disabled' : 'active';
      setUsers((prev) =>
        prev.map((u) => (u.djangoId === user.djangoId ? { ...u, status: newStatus } : u))
      );
      if (viewUser && viewUser.djangoId === user.djangoId) {
        setViewUser((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      showToast(`User ${user.username} is now ${newStatus}.`);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle user status');
    }
  };

  // Create Health Worker Account (Authority only creates Health Worker)
  const handleCreateHealthWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username.trim() || !newUser.password || !newUser.email.trim()) {
      setAddError('Username, password, and email address are required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email.trim())) {
      setAddError('Please provide a valid email address.');
      return;
    }

    if (newUser.password.length < 6) {
      setAddError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    setAddError(null);

    try {
      await authPost('/api/manage/users/create-worker/', {
        username: newUser.username.trim(),
        password: newUser.password,
        email: newUser.email.trim(),
        first_name: newUser.firstName.trim(),
        last_name: newUser.lastName.trim(),
        phone: newUser.phone.trim(),
        organization: newUser.organization.trim(),
        assigned_villages: newUser.assignedVillages,
      });

      setShowAdd(false);
      setNewUser({
        username: '',
        password: '',
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        organization: '',
        assignedVillages: [],
      });
      await loadUsersAndVillages();
      showToast('Health Worker account successfully created.');
    } catch (err: any) {
      setAddError(err.message || 'Failed to create Health Worker account.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal for a User
  const handleOpenEdit = (user: AdminUser) => {
    setEditUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      organization: user.organization,
      assignedVillages: [...user.assignedVillages],
      password: '',
      isActive: user.status === 'active',
    });
    setEditError(null);
  };

  // Submit User Edits
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;

    if (!editForm.email.trim()) {
      setEditError('Email address is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editForm.email.trim())) {
      setEditError('Please enter a valid email address.');
      return;
    }

    if (editForm.password && editForm.password.length < 6) {
      setEditError('New password must be at least 6 characters.');
      return;
    }

    setEditSubmitting(true);
    setEditError(null);

    try {
      const payload: Record<string, any> = {
        first_name: editForm.firstName.trim(),
        last_name: editForm.lastName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        organization: editForm.organization.trim(),
        assigned_villages: editForm.assignedVillages,
        is_active: editForm.isActive,
      };

      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      const updated = await authPatch<DjangoUser>(`/api/manage/users/${editUser.djangoId}/`, payload);

      setEditUser(null);
      await loadUsersAndVillages();
      if (viewUser && viewUser.djangoId === editUser.djangoId) {
        setViewUser(null);
      }
      showToast(`Updated details for ${updated.username} successfully.`);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update user details.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === 'active').length,
    workers: users.filter((u) => u.rawRole === 'HEALTH_WORKER').length,
    authorities: users.filter((u) => u.rawRole === 'AUTHORITY').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Administration"
        subtitle="Manage field personnel, assign surveillance jurisdictions, and provision Health Worker accounts."
        breadcrumb={['Home', 'Administration']}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenHealthReport}
              className="btn-secondary inline-flex items-center gap-1.5"
              title="Download health surveillance report"
            >
              <Download className="h-4 w-4" /> Download PDF Report
            </button>
            <button
              type="button"
              onClick={() => {
                setAddError(null);
                setShowAdd(true);
              }}
              className="btn-primary inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Create Health Worker Account
            </button>
          </div>
        }
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-xs animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Managed Users" value={stats.total} icon={Users} iconColor="text-primary-600" iconBg="bg-primary-50" />
        <StatCard label="Active Accounts" value={stats.active} icon={UserCheck} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <StatCard label="Field Health Workers" value={stats.workers} icon={HeartPulse} iconColor="text-cyan-600" iconBg="bg-cyan-50" />
        <StatCard label="Health Authorities" value={stats.authorities} icon={Shield} iconColor="text-indigo-600" iconBg="bg-indigo-50" />
      </div>

      {/* Search and Filters Bar */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, username, email, or PHC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
          <span className="text-xs font-semibold text-slate-500 mr-1">Role:</span>
          {(['ALL', 'HEALTH_WORKER', 'AUTHORITY'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                roleFilter === r
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r === 'ALL' ? 'All Roles' : r === 'HEALTH_WORKER' ? 'Health Workers' : 'Authorities'}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <LoadingState message="Loading user directory..." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No users found" message="No user accounts match your search or filter criteria." />
        ) : (
          <Table<AdminUser>
            columns={[
              {
                key: 'name',
                header: 'User & Credentials',
                render: (u: AdminUser) => (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                      {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{u.name}</div>
                      <div className="text-xs text-slate-500 truncate">@{u.username}</div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'email',
                header: 'Contact',
                render: (u: AdminUser) => (
                  <div className="text-xs">
                    <div className="text-slate-700 truncate">{u.email}</div>
                    <div className="text-slate-400 mt-0.5">{u.phone || 'No phone added'}</div>
                  </div>
                ),
              },
              {
                key: 'role',
                header: 'Role & Organization',
                render: (u: AdminUser) => {
                  const Icon = roleIcon[u.rawRole] || Users;
                  const isWorker = u.rawRole === 'HEALTH_WORKER';
                  return (
                    <div className="space-y-1">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${
                          isWorker
                            ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        {u.role}
                      </span>
                      {u.organization && (
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                          {u.organization}
                        </div>
                      )}
                    </div>
                  );
                },
              },
              {
                key: 'jurisdiction',
                header: 'Assigned Jurisdiction',
                render: (u: AdminUser) => {
                  if (u.rawRole !== 'HEALTH_WORKER') {
                    return <span className="text-xs text-slate-400">All District Areas</span>;
                  }
                  if (u.assignedVillagesList && u.assignedVillagesList.length > 0) {
                    return (
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {u.assignedVillagesList.slice(0, 2).map((v) => (
                          <span
                            key={v.id}
                            className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium border border-slate-200"
                          >
                            <MapPin className="h-2.5 w-2.5 text-slate-400" />
                            {v.name}
                          </span>
                        ))}
                        {u.assignedVillagesList.length > 2 && (
                          <span className="text-[10px] bg-primary-50 text-primary-700 font-semibold px-1.5 py-0.5 rounded border border-primary-200">
                            +{u.assignedVillagesList.length - 2} more
                          </span>
                        )}
                      </div>
                    );
                  }
                  return <span className="text-xs text-amber-600 font-medium">Unassigned</span>;
                },
              },
              {
                key: 'status',
                header: 'Status',
                render: (u: AdminUser) => (
                  <Badge variant={u.status === 'active' ? 'low' : 'neutral'}>
                    {u.status === 'active' ? 'Active' : 'Disabled'}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (u: AdminUser) => (
                  <div className="flex items-center gap-1">
                    {/* View Details Button */}
                    <button
                      onClick={() => setViewUser(u)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-primary-600 transition-colors"
                      title="See Health Worker Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    {/* Edit Data Button */}
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-600 transition-colors"
                      title="Edit Health Worker Data"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    {/* Toggle Status Button */}
                    <button
                      onClick={() => toggleStatus(u)}
                      className={`rounded-lg p-1.5 hover:bg-slate-100 transition-colors ${
                        u.status === 'active'
                          ? 'text-slate-400 hover:text-red-600'
                          : 'text-slate-400 hover:text-emerald-600'
                      }`}
                      title={u.status === 'active' ? 'Deactivate User Account' : 'Activate User Account'}
                    >
                      {u.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </button>
                  </div>
                ),
              },
            ]}
            data={filtered}
            rowKey={(u) => u.id}
          />
        )}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. CREATE HEALTH WORKER MODAL (Strictly Health Worker role) */}
      {/* ────────────────────────────────────────────────────────── */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Create Health Worker Account"
        size="md"
      >
        <form onSubmit={handleCreateHealthWorker} className="space-y-4">
          {addError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          {/* Account Role: Strictly Health Worker (Created by Authority) */}
          <div>
            <label className="label">Account Role</label>
            <select
              value="HEALTH_WORKER"
              disabled
              className="input bg-slate-50 text-slate-800 font-semibold cursor-not-allowed border-slate-200"
            >
              <option value="HEALTH_WORKER">Health Worker (Created by Authority)</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Health Workers are provisioned by Authorities to record health surveillance cases and log field water samples.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="e.g. worker_anita"
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Min. 6 characters"
                className="input"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">First Name</label>
              <input
                type="text"
                value={newUser.firstName}
                onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                placeholder="Anita"
                className="input"
              />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input
                type="text"
                value={newUser.lastName}
                onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                placeholder="Sharma"
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="anita.sharma@health.gov.in"
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input
                type="text"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Primary Health Centre (PHC) / Clinic</label>
            <input
              type="text"
              value={newUser.organization}
              onChange={(e) => setNewUser({ ...newUser, organization: e.target.value })}
              placeholder="e.g. Primary Health Centre (PHC) Rampur"
              className="input"
            />
          </div>

          {/* Assigned Villages Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Assigned Villages (Jurisdiction)</label>
              <span className="text-[11px] text-slate-500">
                {newUser.assignedVillages.length} village(s) selected
              </span>
            </div>
            <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 space-y-1.5">
              {villagesList.length === 0 ? (
                <div className="text-xs text-slate-400">Loading villages...</div>
              ) : (
                villagesList.map((vil) => {
                  const idNum = Number(vil.id);
                  const isChecked = newUser.assignedVillages.includes(idNum);
                  return (
                    <label
                      key={vil.id}
                      className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:bg-white p-1 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setNewUser((prev) => ({
                            ...prev,
                            assignedVillages: isChecked
                              ? prev.assignedVillages.filter((vId) => vId !== idNum)
                              : [...prev.assignedVillages, idNum],
                          }));
                        }}
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="font-semibold text-slate-800">{vil.name}</span>
                      <span className="text-slate-400">({vil.district})</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Creating Worker Account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ────────────────────────────────────────────────────────── */}
      {/* HEALTH & CITIZEN REPORT DOWNLOAD MODAL (AUTHORITY ARCHIVE)  */}
      {/* ────────────────────────────────────────────────────────── */}
      <DownloadReportModal
        open={showHealthReportModal}
        onClose={() => setShowHealthReportModal(false)}
        records={healthRecords}
        communityReports={communityReports}
        title="Download Public Health & Citizen Surveillance Report (PDF)"
      />

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. SEE / VIEW HEALTH WORKER DETAILS MODAL                  */}
      {/* ────────────────────────────────────────────────────────── */}
      <Modal
        open={Boolean(viewUser)}
        onClose={() => setViewUser(null)}
        title="Health Worker Profile & Details"
        size="md"
      >

        {viewUser && (
          <div className="space-y-5">
            {/* User Header Profile Card */}
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-700 shadow-xs">
                {viewUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'HW'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 truncate">{viewUser.name}</h3>
                  <span className="badge bg-cyan-100 text-cyan-800 border border-cyan-200 font-semibold text-[10px]">
                    {viewUser.role}
                  </span>
                  <Badge variant={viewUser.status === 'active' ? 'low' : 'neutral'}>
                    {viewUser.status === 'active' ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Username: @{viewUser.username}</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-slate-200 p-3 bg-white">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Email Address</span>
                </div>
                <p className="font-medium text-slate-800 break-all">{viewUser.email}</p>
              </div>

              <div className="rounded-lg border border-slate-200 p-3 bg-white">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Phone className="h-3.5 w-3.5" />
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Phone Number</span>
                </div>
                <p className="font-medium text-slate-800">{viewUser.phone || 'Not provided'}</p>
              </div>

              <div className="rounded-lg border border-slate-200 p-3 bg-white sm:col-span-2">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Organization / Primary Health Centre</span>
                </div>
                <p className="font-medium text-slate-800">{viewUser.organization || 'Community Health Division'}</p>
              </div>
            </div>

            {/* Assigned Surveillance Jurisdiction */}
            <div className="rounded-lg border border-slate-200 p-3 bg-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-xs">
                  <MapPin className="h-3.5 w-3.5 text-primary-600" />
                  <span>Assigned Field Jurisdictions</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {viewUser.assignedVillagesList?.length || 0} village(s) assigned
                </span>
              </div>

              {viewUser.assignedVillagesList && viewUser.assignedVillagesList.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {viewUser.assignedVillagesList.map((vil) => (
                    <span
                      key={vil.id}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
                    >
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {vil.name} <span className="text-slate-400 font-normal">({vil.district})</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-600 font-medium py-1">
                  No villages assigned yet. Click "Edit Health Worker" to assign coverage areas.
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => toggleStatus(viewUser)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  viewUser.status === 'active'
                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                    : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                {viewUser.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewUser(null)}
                  className="btn-secondary text-xs"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = viewUser;
                    setViewUser(null);
                    handleOpenEdit(target);
                  }}
                  className="btn-primary inline-flex items-center gap-1.5 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit Health Worker
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. EDIT HEALTH WORKER DATA MODAL                           */}
      {/* ────────────────────────────────────────────────────────── */}
      <Modal
        open={Boolean(editUser)}
        onClose={() => setEditUser(null)}
        title={`Edit Data: ${editUser?.name || 'Health Worker'}`}
        size="md"
      >
        {editUser && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {editError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs flex items-center justify-between">
              <span className="font-semibold text-slate-700">Username: @{editUser.username}</span>
              <span className="badge bg-cyan-100 text-cyan-800 text-[10px] font-semibold">{editUser.role}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">First Name</label>
                <input
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="label">Organization / Primary Health Centre (PHC)</label>
              <input
                type="text"
                value={editForm.organization}
                onChange={(e) => setEditForm({ ...editForm, organization: e.target.value })}
                className="input"
              />
            </div>

            {/* Jurisdiction Coverage */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Assigned Villages (Jurisdiction)</label>
                <span className="text-[11px] text-slate-500 font-medium">
                  {editForm.assignedVillages.length} selected
                </span>
              </div>
              <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 space-y-1.5">
                {villagesList.map((vil) => {
                  const idNum = Number(vil.id);
                  const isChecked = editForm.assignedVillages.includes(idNum);
                  return (
                    <label
                      key={vil.id}
                      className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:bg-white p-1 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setEditForm((prev) => ({
                            ...prev,
                            assignedVillages: isChecked
                              ? prev.assignedVillages.filter((vId) => vId !== idNum)
                              : [...prev.assignedVillages, idNum],
                          }));
                        }}
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="font-semibold text-slate-800">{vil.name}</span>
                      <span className="text-slate-400">({vil.district})</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Reset Password Option */}
            <div>
              <label className="label flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <span>Reset Account Password (Optional)</span>
              </label>
              <input
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Leave blank to keep existing password"
                className="input text-xs"
              />
            </div>

            {/* Status Option */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <div>
                <p className="text-xs font-semibold text-slate-800">Account Access</p>
                <p className="text-[11px] text-slate-500">Allow this user to sign in and submit surveillance reports.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="btn-secondary"
                disabled={editSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={editSubmitting}
              >
                {editSubmitting ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
