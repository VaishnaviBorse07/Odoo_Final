// Organiser reports — overview, peak hours, provider utilization.
import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar.jsx';
import api from '../../api/axios.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function ReportsPage() {
  const [overview, setOverview] = useState(null);
  const [peak, setPeak] = useState([]);
  const [util, setUtil] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [o, p, u] = await Promise.all([
          api.get('/reports/overview'),
          api.get('/reports/peak-hours'),
          api.get('/reports/provider-utilization')
        ]);
        if (!cancelled) {
          setOverview(o.data.data);
          setPeak(p.data.data || []);
          setUtil(u.data.data || []);
        }
      } catch {
        if (!cancelled) {
          setOverview({});
          setPeak([]);
          setUtil([]);
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
                {(!peak || peak.length === 0) && <li className="text-sm text-zen-muted">No data yet.</li>}
              </ul>
            </section>
            <section className="rounded-card bg-white p-6 shadow-sm md:col-span-2">
              <h2 className="font-bold text-zen-ink">Provider utilization</h2>
              <p className="mt-1 text-xs text-zen-muted">Sessions by resource (non-cancelled vs confirmed / pending / cancelled).</p>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b text-xs uppercase text-zen-muted">
                    <tr>
                      <th className="py-2 pr-4">Resource</th>
                      <th className="py-2 pr-4">Booked</th>
                      <th className="py-2 pr-4">Confirmed</th>
                      <th className="py-2 pr-4">Pending</th>
                      <th className="py-2">Cancelled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(util) ? util : []).map((row) => (
                      <tr key={row.resource_name} className="border-b border-slate-50">
                        <td className="py-2 pr-4 font-medium text-zen-ink">{row.resource_name}</td>
                        <td className="py-2 pr-4">{row.total_sessions_booked ?? 0}</td>
                        <td className="py-2 pr-4">{row.total_confirmed ?? 0}</td>
                        <td className="py-2 pr-4">{row.total_pending ?? 0}</td>
                        <td className="py-2">{row.total_cancelled ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!util || util.length === 0) && <p className="mt-3 text-sm text-zen-muted">No resource data yet.</p>}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
