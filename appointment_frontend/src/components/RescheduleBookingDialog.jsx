// Modal: pick new slot and PUT /bookings/:id/reschedule.
import { useCallback, useState } from 'react';
import api from '../api/axios.js';
import SlotPicker from './SlotPicker.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';

export default function RescheduleBookingDialog({ booking, open, onClose, onDone, showToast }) {
  const [pick, setPick] = useState(null);
  const [saving, setSaving] = useState(false);

  const bid = booking?.booking_id ?? booking?.id;
  const aptId = booking?.appointment_type_id;
  const resId = booking?.resource_id;

  const reset = useCallback(() => {
    setPick(null);
  }, []);

  if (!open || !booking) return null;

  const submit = async () => {
    if (!pick || !bid) return;
    setSaving(true);
    try {
      await api.put(`/bookings/${bid}/reschedule`, {
        new_date: pick.date,
        new_start_time: pick.start_time,
        new_end_time: pick.end_time
      });
      showToast?.('Booking rescheduled', 'success');
      reset();
      onClose?.();
      onDone?.();
    } catch (err) {
      showToast?.(err.response?.data?.message || 'Could not reschedule', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-card bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zen-ink">Reschedule</h2>
            <p className="mt-1 text-sm text-zen-muted">
              {booking.service_name} · {String(booking.booking_date)} · current slot{' '}
              {String(booking.start_time).slice(0, 5)} – {String(booking.end_time).slice(0, 5)}
            </p>
          </div>
          <button type="button" onClick={() => { reset(); onClose?.(); }} className="text-sm font-semibold text-zen-muted hover:text-zen-ink">
            Close
          </button>
        </div>
        <div className="mt-4">
          {aptId && resId ? (
            <SlotPicker
              appointmentTypeId={aptId}
              resourceId={resId}
              manageCapacity={Boolean(booking.manage_capacity)}
              onSlotSelected={setPick}
            />
          ) : (
            <p className="text-sm text-zen-error">Missing class or resource on this booking.</p>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={() => { reset(); onClose?.(); }} className="rounded-control border px-4 py-2 text-sm font-semibold">
            Cancel
          </button>
          <button
            type="button"
            disabled={!pick || saving}
            onClick={submit}
            className="rounded-control bg-zen-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <LoadingSpinner size="sm" /> Saving…
              </span>
            ) : (
              'Save new time'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
