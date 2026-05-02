// Organiser view of bookings for one class — GET /api/bookings/appointment/:id.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import api from '../../api/axios.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function BookingsListPage() {
  const { appointmentTypeId } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: res } = await api.get(`/bookings/appointment/${appointmentTypeId}`);
        if (!cancelled) setData(res.data);
      } catch {
        if (!cancelled) setData({ bookings: [], summary: {} });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentTypeId]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link to="/organiser" className="text-sm text-zen-primary">
          ← Dashboard
        </Link>
        <h1 className="mt-4 text-xl font-bold">Bookings</h1>
        <p className="text-sm text-zen-muted">
          Pending: {data.summary?.pending ?? 0} · Confirmed: {data.summary?.confirmed ?? 0}
        </p>
        <ul className="mt-6 space-y-3">
          {(data.bookings || []).map((b) => (
            <li key={b.booking_id} className="rounded-card border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-semibold">{b.customer_name}</p>
                  <p className="text-sm text-zen-muted">
                    {String(b.booking_date)} · {String(b.start_time).slice(0, 5)} – {String(b.end_time).slice(0, 5)}
                  </p>
                </div>
                <StatusBadge status={b.booking_status} />
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
