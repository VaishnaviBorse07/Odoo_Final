// Admin user list — list, activate/deactivate, change role.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import api from '../../api/axios.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { useToast } from '../../components/Toast.jsx';
import { useAuth } from '../../hooks/useAuth.js';

export default function UserManagementPage() {
  const { show } = useToast();
  const { user } = useAuth();
  const [payload, setPayload] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    const { data } = await api.get('/admin/users', { params: { limit: 100 } });
    setPayload(data.data);
  };

  useEffect(() => {
    load().catch(() => setPayload({ users: [], total: 0 }));
  }, []);

  const patchStatus = async (uid, status) => {
    if (uid === user?.id && status === 'inactive') {
      show('You cannot deactivate your own account here.', 'error');
      return;
    }
    setBusy(uid);
    try {
      await api.patch(`/admin/users/${uid}/status`, { status });
      show('Status updated', 'success');
      await load();
    } catch (err) {
      show(err.response?.data?.message || 'Failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  const patchRole = async (uid, role) => {
    setBusy(uid);
    try {
      await api.patch(`/admin/users/${uid}/role`, { role });
      show('Role updated', 'success');
      await load();
    } catch (err) {
      show(err.response?.data?.message || 'Failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  if (!payload) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link to="/admin" className="text-sm font-semibold text-zen-primary">
          ← Admin
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Users</h1>
        <p className="text-sm text-zen-muted">Total: {payload.total}</p>
        <div className="mt-6 overflow-x-auto rounded-card bg-white shadow">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-zen-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(payload.users || []).map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium">{u.full_name}</td>
                  <td className="px-4 py-3 text-zen-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded border border-slate-200 px-2 py-1 text-xs"
                      value={u.role}
                      disabled={busy === u.id}
                      onChange={(e) => patchRole(u.id, e.target.value)}
                    >
                      <option value="customer">customer</option>
                      <option value="organiser">organiser</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {u.status === 'pending_verification' ? (
                      <span className="text-xs text-amber-800">pending verification</span>
                    ) : (
                      <select
                        className="rounded border border-slate-200 px-2 py-1 text-xs"
                        value={u.status}
                        disabled={busy === u.id}
                        onChange={(e) => patchStatus(u.id, e.target.value)}
                      >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-zen-muted">
                    {u.id === user?.id ? 'This is you' : busy === u.id ? 'Saving…' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-zen-muted">
          Role and status apply immediately on change. You cannot deactivate your own account from this screen.
        </p>
      </main>
    </div>
  );
}
