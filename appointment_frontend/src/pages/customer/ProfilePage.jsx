import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar.jsx';
import api from '../../api/axios.js';
import { useAuth } from '../../hooks/useAuth.js';
import { completeBookingPayment } from '../../utils/completeBookingPayment.js';
import BookingCard from '../../components/BookingCard.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import RescheduleBookingDialog from '../../components/RescheduleBookingDialog.jsx';
import { useToast } from '../../components/Toast.jsx';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function ProfilePage() {
  const { user, login } = useAuth();
  const { show } = useToast();
  const nav = useNavigate();
  const [tab, setTab] = useState('upcoming');
  const [bookings, setBookings] = useState({ upcoming: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [cancelId, setCancelId] = useState(null);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);

  const load = async () => {
    const { data } = await api.get('/bookings/my');
    setBookings(data.data || { upcoming: [], past: [] });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveProfile = async () => {
    const { data } = await api.put('/users/profile', { full_name: name, phone });
    const token = localStorage.getItem('zenflow_token');
    login({ ...user, ...data.data }, token);
    show('Profile saved', 'success');
    setEdit(false);
  };

  const cancelBooking = async () => {
    if (!cancelId) return;
    await api.put(`/bookings/${cancelId}/cancel`, {});
    show('Booking cancelled', 'success');
    setCancelId(null);
    await load();
    nav('/');
  };

  const pay = async (b) => {
    try {
      await completeBookingPayment(b, {
        email: user?.email,
        description: b.service_name
      });
      show('Payment recorded', 'success');
      await load();
    } catch (e) {
      show(e.message || e.response?.data?.message || 'Payment failed', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-2">
        <section className="rounded-card bg-white p-6 shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zen-primary text-xl font-bold text-white">
            {(user?.full_name || '?')
              .split(' ')
              .map((s) => s[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <h2 className="mt-4 text-xl font-bold">{user?.full_name}</h2>
          <p className="text-sm text-zen-muted">{user?.email}</p>
          {!edit ? (
            <>
              <p className="mt-2 text-sm">Phone: {user?.phone || 'Not provided'}</p>
              <button
                type="button"
                onClick={() => setEdit(true)}
                className="mt-4 rounded-control bg-zen-secondary px-4 py-2 text-sm font-semibold text-zen-primary"
              >
                Edit Profile
              </button>
            </>
          ) : (
            <div className="mt-4 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-control border px-3 py-2 text-sm"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-control border px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button type="button" onClick={saveProfile} className="rounded-control bg-zen-primary px-4 py-2 text-sm text-white">
                  Save
                </button>
                <button type="button" onClick={() => setEdit(false)} className="rounded-control border px-4 py-2 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
        <section className="rounded-card bg-white p-6 shadow-sm">
          <div className="flex gap-2 border-b border-slate-100 pb-3">
            <button
              type="button"
              className={`rounded-full px-4 py-1 text-sm font-semibold ${tab === 'upcoming' ? 'bg-zen-primary text-white' : ''}`}
              onClick={() => setTab('upcoming')}
            >
              Upcoming
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-1 text-sm font-semibold ${tab === 'past' ? 'bg-zen-primary text-white' : ''}`}
              onClick={() => setTab('past')}
            >
              Past
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {(tab === 'upcoming' ? bookings.upcoming : bookings.past).map((b) => (
                <BookingCard
                  key={b.booking_id}
                  booking={b}
                  showActions={tab === 'upcoming'}
                  onPay={pay}
                  onReschedule={(x) => setRescheduleBooking(x)}
                  onCancel={(x) => setCancelId(x.booking_id)}
                />
              ))}
              {(tab === 'upcoming' ? bookings.upcoming : bookings.past).length === 0 && (
                <p className="text-sm text-zen-muted">No bookings in this tab.</p>
              )}
            </div>
          )}
        </section>
      </main>
      <ConfirmDialog
        isOpen={Boolean(cancelId)}
        title="Cancel booking?"
        message="This will free your slot."
        onCancel={() => setCancelId(null)}
        onConfirm={cancelBooking}
        confirmLabel="Cancel booking"
      />
      <RescheduleBookingDialog
        open={Boolean(rescheduleBooking)}
        booking={rescheduleBooking}
        onClose={() => setRescheduleBooking(null)}
        onDone={load}
        showToast={show}
      />
    </div>
  );
}
