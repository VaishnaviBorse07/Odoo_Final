import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import api from '../../api/axios.js';
import { formatDateLabel, formatTimeRange } from '../../utils/dateFormat.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function BookingConfirmPage() {
  const loc = useLocation();
  const initial = loc.state?.booking;
  const [detail, setDetail] = useState(initial || null);
  const id = initial?.id ?? initial?.booking_id;
  const [loading, setLoading] = useState(Boolean(id));

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/bookings/${id}`);
        if (!cancelled) setDetail(data.data);
      } catch {
        if (!cancelled) setDetail(initial);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, initial]);

  if (!initial && !id) {
    return (
      <div className="p-8 text-center">
        <p>No booking data.</p>
        <Link to="/" className="text-zen-primary">
          Home
        </Link>
      </div>
    );
  }

  const b = detail || initial;
  const ref = String(b.confirmation_token || '')
    .replace(/-/g, '')
    .slice(0, 8)
    .toUpperCase();

  const dateStr = b.booking_date ? formatDateLabel(b.booking_date) : '—';
  const timeStr =
    b.start_time && b.end_time ? formatTimeRange(b.start_time, b.end_time) : '—';
  const status = b.booking_status || b.status;
  const pay = b.payment_status;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-lg px-4 py-12 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-zen-primary text-4xl text-white animate-[pop_0.5s_ease]">
          ✓
        </div>
        <style>{`@keyframes pop { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
        <h1 className="text-2xl font-extrabold text-zen-ink">
          {status === 'pending' ? 'Booking submitted' : 'Booking confirmed'}
        </h1>
        <p className="mt-2 text-sm text-zen-muted">
          {pay === 'pending' && b.advance_payment
            ? 'Complete payment from My Bookings if checkout was interrupted.'
            : 'Thank you — see details below.'}
        </p>
        {loading ? (
          <div className="mt-8 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="mt-6 rounded-card bg-white p-6 text-left shadow">
            <p className="text-xs font-bold uppercase tracking-wide text-zen-muted">Reference</p>
            <p className="font-mono text-sm">{ref}</p>
            <div className="mt-2">
              <StatusBadge status={status} />
            </div>
            <hr className="my-4 border-slate-100" />
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-zen-muted">Class</dt>
                <dd className="font-semibold text-zen-ink">{b.service_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-zen-muted">When</dt>
                <dd className="font-semibold text-zen-ink">
                  {dateStr} · {timeStr}
                </dd>
              </div>
              <div>
                <dt className="text-zen-muted">Provider</dt>
                <dd className="font-semibold text-zen-ink">{b.resource_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-zen-muted">Venue</dt>
                <dd className="text-zen-ink">{b.location || '—'}</dd>
              </div>
              {b.advance_payment ? (
                <div>
                  <dt className="text-zen-muted">Payment</dt>
                  <dd className="text-zen-ink">
                    {pay === 'paid' ? 'Paid' : pay === 'pending' ? 'Payment pending' : pay || '—'}
                    {b.payment_amount != null ? ` · ₹${Number(b.payment_amount).toLocaleString('en-IN')}` : ''}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        )}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/profile"
            className="rounded-control bg-zen-primary px-6 py-3 text-center text-sm font-bold text-white hover:bg-zen-accent"
          >
            View My Bookings
          </Link>
          <Link
            to="/"
            className="rounded-control border border-slate-200 px-6 py-3 text-center text-sm font-bold text-zen-ink hover:bg-slate-50"
          >
            Book Another Class
          </Link>
        </div>
      </main>
    </div>
  );
}
