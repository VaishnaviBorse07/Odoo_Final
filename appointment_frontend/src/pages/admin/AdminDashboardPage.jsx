// Admin system stats — GET /api/admin/stats.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import api from '../../api/axios.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/admin/stats');
        if (!cancelled) setStats(data.data);
      } catch {
        if (!cancelled) setStats({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Admin dashboard</h1>
        <Link to="/admin/users" className="mt-4 inline-block text-sm font-semibold text-zen-primary">
          Manage users →
        </Link>
        {!stats ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {Object.entries(stats).map(([k, v]) => (
              <div key={k} className="rounded-card bg-white p-4 shadow-sm">
                <p className="text-xs uppercase text-zen-muted">{k.replace(/_/g, ' ')}</p>
                <p className="text-2xl font-bold text-zen-primary">{v}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
