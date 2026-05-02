// Organiser reports — GET /api/reports/*.
import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar.jsx';
import api from '../../api/axios.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function ReportsPage() {
  const [overview, setOverview] = useState(null);
  const [peak, setPeak] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [o, p] = await Promise.all([api.get('/reports/overview'), api.get('/reports/peak-hours')]);
        if (!cancelled) {
          setOverview(o.data.data);
          setPeak(p.data.data || []);
        }
      } catch {
        if (!cancelled) {
          setOverview({});
          setPeak([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
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
        <h1 className="text-2xl font-bold">Reports</h1>
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <section className="rounded-card bg-white p-6 shadow-sm">
              <h2 className="font-bold text-zen-ink">Overview</h2>
              <ul className="mt-3 space-y-2 text-sm text-zen-muted">
                <li>Total bookings: {overview?.total_bookings ?? 0}</li>
                <li>Confirmed: {overview?.confirmed_bookings ?? 0}</li>
                <li>Pending: {overview?.pending_bookings ?? 0}</li>
                <li>Cancelled: {overview?.cancelled_bookings ?? 0}</li>
                <li>Completed: {overview?.completed_sessions ?? 0}</li>
              </ul>
            </section>
            <section className="rounded-card bg-white p-6 shadow-sm">
              <h2 className="font-bold text-zen-ink">Peak hours</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {(Array.isArray(peak) ? peak : []).map((r, i) => (
                  <li key={i} className="flex justify-between border-b border-slate-50 py-1">
                    <span>{String(r.start_time).slice(0, 5)}</span>
                    <span className="font-semibold text-zen-primary">{r.booking_count}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
