import { useState, useEffect } from 'react';
import { Plus, Search, Eye, UserX, UserCheck, Users, Shield, HeartPulse, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Modal } from '@/components/ui/Modal';
import { authGet, authPost, authPatch } from '@/services/authFetch';
import type { User } from '@/types';

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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    organization: '',
    role: 'HEALTH_WORKER',
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await authGet<DjangoUser[]>('/api/manage/users/');
      const mappedUsers: User[] = data.map((u) => ({
        id: String(u.id),
        name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username,
        email: u.email || `${u.username}@system.local`,
        role: u.role === 'HEALTH_WORKER' ? 'Health Worker' : u.role === 'AUTHORITY' ? 'Authority' : 'Admin',
        status: u.is_active === false ? 'disabled' : 'active',
        lastLogin: new Date().toISOString(),
      }));
      setUsers(mappedUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = users.filter(
    (u) =>
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = async (id: string) => {
    try {
      const updatedUser: DjangoUser = await authPatch(`/api/manage/users/${id}/toggle/`, {});
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: updatedUser.is_active === false ? 'disabled' : 'active' } : u))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to toggle user status');
    }
  };

  const handleAdd = async () => {
    if (!newUser.username.trim() || !newUser.password) {
      setError('Username and password are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const endpoint =
        newUser.role === 'AUTHORITY'
          ? '/api/manage/users/create-authority/'
          : '/api/manage/users/create-worker/';

      await authPost(endpoint, {
        username: newUser.username.trim(),
        password: newUser.password,
        email: newUser.email.trim(),
        first_name: newUser.firstName.trim(),
        last_name: newUser.lastName.trim(),
        phone: newUser.phone.trim(),
        organization: newUser.organization.trim(),
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
        role: 'HEALTH_WORKER',
      });
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user account.');
    } finally {
      setSubmitting(false);
    }
  };

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === 'active').length,
    workers: users.filter((u) => u.role === 'Health Worker').length,
    authorities: users.filter((u) => u.role === 'Authority' || u.role === 'Admin').length,
  };

  return (
    <div>
      <PageHeader
        title="User Administration"
        subtitle="Manage system users, roles, and create Health Worker accounts."
        breadcrumb={['Home', 'Administration']}
        actions={
          <button onClick={() => { setError(null); setShowAdd(true); }} className="btn-primary">
            <Plus className="h-4 w-4" /> Add New User / Worker
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Managed Users" value={stats.total} icon={Users} iconColor="text-primary-600" iconBg="bg-primary-50" />
        <StatCard label="Active Users" value={stats.active} icon={UserCheck} iconColor="text-risk-low" iconBg="bg-risk-low-bg" />
        <StatCard label="Health Workers" value={stats.workers} icon={HeartPulse} iconColor="text-primary-600" iconBg="bg-primary-50" />
        <StatCard label="Authorities" value={stats.authorities} icon={Shield} iconColor="text-primary-600" iconBg="bg-primary-50" />
      </div>

      <div className="card mt-6 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      <div className="card mt-4">
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No users found" message="No users match your search criteria." />
        ) : (
          <Table
            columns={[
              {
                key: 'name',
                header: 'Name',
                render: (u: User) => (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                      {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-900">{u.name}</span>
                  </div>
                ),
              },
              { key: 'email', header: 'Email', render: (u: User) => <span className="text-slate-600">{u.email}</span> },
              {
                key: 'role',
                header: 'Role',
                render: (u: User) => {
                  const Icon = roleIcon[u.role] || Users;
                  return (
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                      <Icon className="h-3.5 w-3.5 text-slate-400" />
                      {u.role}
                    </span>
                  );
                },
              },
              {
                key: 'status',
                header: 'Status',
                render: (u: User) => (
                  <Badge variant={u.status === 'active' ? 'low' : 'neutral'}>
                    {u.status === 'active' ? 'Active' : 'Disabled'}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (u: User) => (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleStatus(u.id)}
                      className={`rounded-lg p-1.5 hover:bg-slate-100 ${
                        u.status === 'active' ? 'text-slate-500 hover:text-risk-critical' : 'text-slate-500 hover:text-risk-low'
                      }`}
                      title={u.status === 'active' ? 'Disable User' : 'Enable User'}
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

      {/* Add User Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create User Account" size="sm">
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-risk-critical-bg p-3 text-sm text-risk-critical">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="label">Account Role</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="input"
            >
              <option value="HEALTH_WORKER">Health Worker (Created by Authority)</option>
              <option value="AUTHORITY">Authority (Created by Admin)</option>
            </select>
          </div>

          <div>
            <label className="label">Username <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              placeholder="e.g. worker_ravi"
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">Password <span className="text-red-500">*</span></label>
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              placeholder="Minimum 6 characters"
              className="input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">First Name</label>
              <input
                type="text"
                value={newUser.firstName}
                onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                placeholder="Ravi"
                className="input"
              />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input
                type="text"
                value={newUser.lastName}
                onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                placeholder="Kumar"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="worker@health.gov.in"
              className="input"
            />
          </div>

          <div>
            <label className="label">Phone Number</label>
            <input
              type="text"
              value={newUser.phone}
              onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
              placeholder="+919876543210"
              className="input"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setShowAdd(false)} className="btn-secondary" disabled={submitting}>
            Cancel
          </button>
          <button onClick={handleAdd} className="btn-primary" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
