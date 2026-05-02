// Organiser view of bookings for one class — list, confirm, complete, detail.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import api from '../../api/axios.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { useToast } from '../../components/Toast.jsx';

function isPastDate(iso) {
  if (!iso) return false;
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00');
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return d < t;
}

export default function BookingsListPage() {
  const { appointmentTypeId } = useParams();
  const { show } = useToast();
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    const { data: res } = await api.get(`/bookings/appointment/${appointmentTypeId}`);
    setData(res.data);
  };

  useEffect(() => {
    load().catch(() => setData({ bookings: [], summary: {} }));
  }, [appointmentTypeId]);

  const toggleExpand = async (bookingId) => {
    if (expanded === bookingId) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    setExpanded(bookingId);
    try {
      const { data: res } = await api.get(`/bookings/${bookingId}`);
      setDetail(res.data);
    } catch {
      setDetail(null);
    }
  };

  const confirm = async (bookingId) => {
    setBusy(bookingId);
    try {
      await api.put(`/bookings/${bookingId}/confirm`, {});
      show('Booking confirmed', 'success');
      await load();
    } catch (err) {
      show(err.response?.data?.message || 'Could not confirm', 'error');
    } finally {
      setBusy(null);
    }
  };

  const complete = async (bookingId) => {
    setBusy(bookingId);
    try {
      await api.put(`/bookings/${bookingId}/complete`, {});
      show('Marked complete', 'success');
      await load();
    } catch (err) {
      show(err.response?.data?.message || 'Could not complete', 'error');
    } finally {
      setBusy(null);
    }
  };

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
        <Link to="/organiser" className="text-sm font-semibold text-zen-primary">
          ← Dashboard
        </Link>
        <h1 className="mt-4 text-xl font-bold">Bookings</h1>
        <p className="text-sm text-zen-muted">
          Pending: {data.summary?.pending ?? 0} · Confirmed: {data.summary?.confirmed ?? 0}
        </p>
        <ul className="mt-6 space-y-3">
          {(data.bookings || []).map((b) => {
            const bid = b.booking_id;
            const canComplete = b.booking_status === 'confirmed' && isPastDate(b.booking_date);
            const needsConfirm =
              b.booking_status === 'pending' &&
              b.confirmation_type === 'manual' &&
              (!b.advance_payment || b.payment_status === 'paid');
            return (
              <li key={bid} className="rounded-card border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{b.customer_name}</p>
                    <p className="text-sm text-zen-muted">
                      {String(b.booking_date)} · {String(b.start_time).slice(0, 5)} – {String(b.end_time).slice(0, 5)}
                    </p>
                    <p className="text-xs text-zen-muted">
                      Payment: {b.payment_status}
                      {b.advance_payment ? ` · Fee ₹${Number(b.payment_amount || 0).toLocaleString('en-IN')}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={b.booking_status} />
                    {needsConfirm && (
                      <button
                        type="button"
                        disabled={busy === bid}
                        onClick={() => confirm(bid)}
                        className="rounded-control bg-zen-primary px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
                      >
                        Confirm
                      </button>
                    )}
                    {canComplete && (
                      <button
                        type="button"
                        disabled={busy === bid}
                        onClick={() => complete(bid)}
                        className="rounded-control border border-slate-200 px-3 py-1 text-xs font-bold disabled:opacity-50"
                      >
                        Complete
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleExpand(bid)}
                      className="rounded-control border border-slate-200 px-3 py-1 text-xs font-semibold"
                    >
                      {expanded === bid ? 'Hide' : 'Details'}
                    </button>
                  </div>
                </div>
                {expanded === bid && detail && (
                  <div className="mt-3 border-t border-slate-100 pt-3 text-sm">
                    <p className="text-zen-muted">Customer email: {detail.customer_email || b.customer_email || '—'}</p>
                    {detail.answers?.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {detail.answers.map((a) => (
                          <li key={a.question_id}>
                            <span className="font-semibold">{a.question_text}</span>: {a.answer_text || '—'}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
