// Booking summary row — optional reschedule/cancel/pay actions for upcoming customer bookings.
import StatusBadge from './StatusBadge.jsx';
import { formatDateLabel, formatTimeRange } from '../utils/dateFormat.js';

export default function BookingCard({ booking, showActions, onReschedule, onCancel, onPay }) {
  const dateStr = formatDateLabel(booking.booking_date);
  const timeStr = formatTimeRange(booking.start_time, booking.end_time);

  return (
    <div className="rounded-card border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold text-zen-ink">{booking.service_name}</p>
          <p className="text-sm text-zen-muted">
            {dateStr} · {timeStr}
          </p>
          <p className="text-sm text-zen-muted">Instructor: {booking.resource_name}</p>
          <p className="text-sm text-zen-muted">{booking.location}</p>
        </div>
        <StatusBadge status={booking.booking_status} />
      </div>
      {showActions && booking.booking_status !== 'cancelled' && booking.booking_status !== 'completed' && (
        <div className="mt-3 flex flex-wrap gap-2">
          {booking.payment_status === 'pending' && booking.advance_payment && (
            <button
              type="button"
              onClick={() => onPay?.(booking)}
              className="rounded-control bg-zen-warning px-3 py-1 text-xs font-bold text-white"
            >
              Pay Now
            </button>
          )}
          <button
            type="button"
            onClick={() => onReschedule?.(booking)}
            className="rounded-control border border-zen-primary px-3 py-1 text-xs font-semibold text-zen-primary hover:bg-zen-secondary"
          >
            Reschedule
          </button>
          <button
            type="button"
            onClick={() => onCancel?.(booking)}
            className="rounded-control border border-zen-error px-3 py-1 text-xs font-semibold text-zen-error hover:bg-red-50"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
