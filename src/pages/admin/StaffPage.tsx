import React, { useState, useEffect } from 'react';
import { apiRequest, formatDate } from '../../lib/api.ts';
import { User } from '../../types/index.ts';
import { Modal } from '../../components/common/Modal.tsx';
import {
  Plus,
  UserCheck,
  Shield,
  KeyRound,
  Check,
  X,
  Users,
  ShieldCheck,
} from 'lucide-react';

export const StaffPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Brightloop@2026!');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<User[]>('/users');
      setUsers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiRequest('/users/staff', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      setShowAddModal(false);
      setName('');
      setEmail('');
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create staff account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await apiRequest(`/users/${userId}/status`, { method: 'PATCH' });
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const staffMembers = users.filter((u) => u.role === 'STAFF' || u.role === 'ADMIN');

  const getAvatarInitials = (name: string) => {
    if (!name) return 'S';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Internal Staff &amp; Access Control</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Administrator-only creation of internal billing specialists and customer operations operators.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-600/30 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Staff Account</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Staff Operators</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {staffMembers.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Active team members</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Security Roles</span>
            <Shield className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 text-lg font-bold text-slate-900">
            RBAC Enforced
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">ADMIN &amp; STAFF capabilities</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Password Policy</span>
            <KeyRound className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-lg font-bold text-slate-900">
            Enterprise Bcrypt
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Bcrypt-10 salted hashes</p>
        </div>
      </div>

      {/* Staff Table */}
      <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Work Email</th>
                <th className="py-3 px-4 text-center">Account Status</th>
                <th className="py-3 px-4 text-right">Created Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="animate-spin w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full mx-auto mb-2" />
                    Loading staff records...
                  </td>
                </tr>
              ) : staffMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No internal staff found.
                  </td>
                </tr>
              ) : (
                staffMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0">
                          {getAvatarInitials(member.name)}
                        </div>
                        <div className="font-semibold text-slate-900">{member.name}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          member.role === 'ADMIN'
                            ? 'bg-purple-50 text-purple-700 border-purple-200/60'
                            : 'bg-blue-50 text-blue-700 border-blue-200/60'
                        }`}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">{member.email}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          member.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                            : 'bg-slate-100 text-slate-400 border-slate-200/60'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${member.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{member.isActive ? 'Active' : 'Deactivated'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px] tabular-nums">
                      {formatDate(member.created_at || (member as any).created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {member.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleToggleStatus(member.id)}
                          className="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          {member.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create Internal Staff Member"
        subtitle="Grant operational access for day-to-day customer management & invoices"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              placeholder="Sarah Jenkins"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email *</label>
            <input
              type="email"
              required
              placeholder="sarah.jenkins@brightloop.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Temporary Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs font-mono bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Must be at least 9 characters with uppercase, lowercase, and special character.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/30 disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting ? 'Creating...' : 'Create Staff Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
