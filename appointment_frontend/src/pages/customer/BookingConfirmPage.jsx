import { Link, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function BookingConfirmPage() {
  const loc = useLocation();
  const booking = loc.state?.booking;

  if (!booking) {
    return (
      <div className="p-8 text-center">
        <p>No booking data.</p>
        <Link to="/" className="text-zen-primary">
          Home
        </Link>
      </div>
    );
  }

  const ref = String(booking.confirmation_token || '')
    .replace(/-/g, '')
    .slice(0, 8)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-lg px-4 py-12 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-zen-primary text-4xl text-white animate-[pop_0.5s_ease]">
          ✓
        </div>
        <style>{`@keyframes pop { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
        <h1 className="text-2xl font-extrabold text-zen-ink">
          {booking.status === 'pending' ? 'Booking Submitted!' : 'Booking Confirmed!'}
        </h1>
        <div className="mt-6 rounded-card bg-white p-6 text-left shadow">
          <p className="text-sm text-zen-muted">Ref: {ref}</p>
          <div className="mt-2">
            <StatusBadge status={booking.status} />
          </div>
        </div>
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
