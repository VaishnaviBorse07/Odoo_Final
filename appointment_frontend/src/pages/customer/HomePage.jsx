import { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/Navbar.jsx';
import ClassCard from '../../components/ClassCard.jsx';
import api from '../../api/axios.js';
import { useAuth } from '../../hooks/useAuth.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

const CHIPS = ['All', 'Yoga', 'Meditation', 'Workshop', 'Private'];

export default function HomePage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [chip, setChip] = useState('All');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/appointments', { params: { search: q || undefined } });
        if (!cancelled) setItems(data.data?.appointments || []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q]);

  const filtered = useMemo(() => {
    if (chip === 'All') return items;
    const k = chip.toLowerCase();
    return items.filter(
      (a) =>
        (a.name || '').toLowerCase().includes(k) || (a.description || '').toLowerCase().includes(k)
    );
  }, [items, chip]);

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-card bg-gradient-to-r from-zen-secondary to-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-extrabold text-zen-ink">
              {greet}, {user?.full_name}. Ready for your practice?
            </h1>
            <button
              type="button"
              onClick={() => document.getElementById('browse-classes')?.scrollIntoView({ behavior: 'smooth' })}
              className="rounded-control bg-zen-primary px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-zen-accent"
            >
              Book a class
            </button>
          </div>
        </div>
        <div className="mt-6">
          <input
            placeholder="Search for a class..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-control border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zen-primary"
          />
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChip(c)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
                chip === c ? 'bg-zen-primary text-white' : 'bg-white text-zen-ink ring-1 ring-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div id="browse-classes" className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.length === 0 ? (
              <p className="text-zen-muted">No classes found. Try a different search.</p>
            ) : (
              filtered.map((a) => <ClassCard key={a.id} appointment={a} />)
            )}
          </div>
        )}
      </main>
    </div>
  );
}
