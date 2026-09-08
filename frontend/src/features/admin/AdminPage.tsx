import { useState, useEffect } from 'react';
import { Plus, Search, Eye, Pencil, UserX, UserCheck, Users, Shield, HeartPulse } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/services/api';
import { formatDateTime } from '@/utils/risk';
import type { User } from '@/types';

const roleIcon: Record<string, React.ElementType> = {
  Admin: Shield,
  'Health Worker': HeartPulse,
  Authority: Users,
};

export function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Health Worker' });

  useEffect(() => {
    api.getUsers().then((u) => {
      setUsers(u);
      setLoading(false);
    });
  }, []);

  const filtered = users.filter((u) =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = (id: string) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: u.status === 'active' ? 'disabled' : 'active' } : u)));
  };

  const handleAdd = () => {
    if (!newUser.name || !newUser.email) return;
    setUsers((prev) => [...prev, { id: `u${Date.now()}`, name: newUser.name, email: newUser.email, role: newUser.role as User['role'], status: 'active', lastLogin: new Date().toISOString() }]);
    setNewUser({ name: '', email: '', role: 'Health Worker' });
    setShowAdd(false);
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
        subtitle="Manage system users, roles, and access permissions."
        breadcrumb={['Home', 'Administration']}
        actions={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="h-4 w-4" /> Add User</button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Users" value={stats.total} icon={Users} iconColor="text-primary-600" iconBg="bg-primary-50" />
        <StatCard label="Active Users" value={stats.active} icon={UserCheck} iconColor="text-risk-low" iconBg="bg-risk-low-bg" />
        <StatCard label="Health Workers" value={stats.workers} icon={HeartPulse} iconColor="text-primary-600" iconBg="bg-primary-50" />
        <StatCard label="Admins & Authorities" value={stats.authorities} icon={Shield} iconColor="text-primary-600" iconBg="bg-primary-50" />
      </div>

      <div className="card mt-6 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search users by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
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
                      {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
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
                  const Icon = roleIcon[u.role];
                  return <span className="inline-flex items-center gap-1.5 text-sm text-slate-700"><Icon className="h-3.5 w-3.5 text-slate-400" />{u.role}</span>;
                },
              },
              {
                key: 'status',
                header: 'Status',
                render: (u: User) => <Badge variant={u.status === 'active' ? 'low' : 'neutral'}>{u.status === 'active' ? 'Active' : 'Disabled'}</Badge>,
              },
              { key: 'lastLogin', header: 'Last Login', render: (u: User) => <span className="text-xs text-slate-400">{formatDateTime(u.lastLogin)}</span> },
              {
                key: 'actions',
                header: 'Actions',
                render: (u: User) => (
                  <div className="flex items-center gap-1">
                    <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-primary-600" title="View"><Eye className="h-4 w-4" /></button>
                    <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-primary-600" title="Edit"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => toggleStatus(u.id)} className={`rounded-lg p-1.5 hover:bg-slate-100 ${u.status === 'active' ? 'text-slate-500 hover:text-risk-critical' : 'text-slate-500 hover:text-risk-low'}`} title={u.status === 'active' ? 'Disable' : 'Enable'}>
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

      {/* Add user modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New User" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input type="text" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Enter full name" className="input" />
          </div>
          <div>
            <label className="label">Email Address</label>
            <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="name@health.gov.in" className="input" />
          </div>
          <div>
            <label className="label">Role</label>
            <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="input">
              <option>Admin</option>
              <option>Health Worker</option>
              <option>Authority</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleAdd} className="btn-primary">Add User</button>
        </div>
      </Modal>
    </div>
  );
}
