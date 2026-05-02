import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar.jsx';
import api from '../../api/axios.js';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge.jsx';
import { useToast } from '../../components/Toast.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function DashboardPage() {
  const { show } = useToast();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await api.get('/appointments/mine');
    setItems(data.data?.appointments || []);
  };

  useEffect(() => {
    (async () => {
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = async (id, next) => {
    await api.patch(`/appointments/${id}/status`, { status: next });
    show('Status updated', 'success');
    await load();
  };

  const share = (token) => {
    const url = `${window.location.origin}/book/share/${token}`;
    navigator.clipboard.writeText(url);
    show('Link copied to clipboard!', 'success');
  };

  const filtered = items.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/organiser/new"
            className="rounded-control bg-zen-primary px-5 py-2 text-sm font-bold text-white hover:bg-zen-accent"
          >
            + New Class
          </Link>
          <input
            placeholder="Search classes..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full max-w-xs rounded-control border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zen-primary"
          />
        </div>
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {filtered.length === 0 && <p className="text-zen-muted">No classes yet.</p>}
            {filtered.map((a) => (
              <div key={a.id} className="relative rounded-card border border-slate-200 bg-white p-5 shadow-sm">
                <button
                  type="button"
                  className="absolute right-3 top-3 rotate-12 rounded bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800"
                  onClick={() => toggle(a.id, a.status === 'published' ? 'unpublished' : 'published')}
                >
                  {a.status}
                </button>
                <h3 className="text-lg font-bold text-zen-ink">{a.name}</h3>
                <p className="text-sm text-zen-muted">{a.duration_minutes} min</p>
                <p className="text-sm text-zen-muted">{a.upcoming_count ?? 0} upcoming</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => share(a.share_token)}
                    className="rounded-control border border-slate-200 px-3 py-1 text-xs font-semibold"
                  >
                    Share
                  </button>
                  <Link
                    to={`/organiser/edit/${a.id}`}
                    className="rounded-control border border-slate-200 px-3 py-1 text-xs font-semibold"
                  >
                    Edit
                  </Link>
                  <Link
                    to={`/organiser/bookings/${a.id}`}
                    className="rounded-control border border-slate-200 px-3 py-1 text-xs font-semibold"
                  >
                    Bookings
                  </Link>
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
