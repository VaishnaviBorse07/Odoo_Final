// Admin user list — GET /api/admin/users.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import api from '../../api/axios.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function UserManagementPage() {
  const [payload, setPayload] = useState(null);

  const load = async () => {
    const { data } = await api.get('/admin/users', { params: { limit: 50 } });
    setPayload(data.data);
  };

  useEffect(() => {
    load().catch(() => setPayload({ users: [], total: 0 }));
  }, []);

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
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link to="/admin" className="text-sm text-zen-primary">
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
              </tr>
            </thead>
            <tbody>
              {(payload.users || []).map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium">{u.full_name}</td>
                  <td className="px-4 py-3 text-zen-muted">{u.email}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3">{u.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
