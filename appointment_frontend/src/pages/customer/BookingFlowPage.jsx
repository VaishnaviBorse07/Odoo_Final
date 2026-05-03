import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import api from '../../api/axios.js';
import SlotPicker from '../../components/SlotPicker.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import HoldTimer from '../../components/HoldTimer.jsx';
import { useToast } from '../../components/Toast.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { completeBookingPayment } from '../../utils/completeBookingPayment.js';

function bookingErrorMessage(err) {
  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
    return 'Backend API is not reachable. Start the backend on port 8000, then try again.';
  }
  return err.response?.data?.message || err.message || 'Booking failed';
}

export default function BookingFlowPage() {
  const { appointmentTypeId, token } = useParams();
  const nav = useNavigate();
  const { show } = useToast();
  const { user } = useAuth();

  const [apt, setApt] = useState(null);
  const [step, setStep] = useState(1);
  const [resourceId, setResourceId] = useState(null);
  const [slotPick, setSlotPick] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ── Hold state ─────────────────────────────────────────────────────────────
  const [hold, setHold] = useState(null);           // { hold_id, expires_at }
  const [holdLoading, setHoldLoading] = useState(false);
  const holdRef = useRef(null);                     // keep ref for cleanup

  useEffect(() => {
    holdRef.current = hold;
  }, [hold]);

  // If the user picks a new slot (goes back to step 2), release the old hold
  const releaseHold = useCallback(async (h) => {
    if (!h?.hold_id) return;
    try { await api.delete(`/bookings/hold/${h.hold_id}`); } catch { /* best effort */ }
    setHold(null);
  }, []);

  const resolvedId = apt?.id;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (token) {
          const { data } = await api.get(`/appointments/share/${token}`);
          if (!cancelled) setApt(data.data);
        } else if (appointmentTypeId) {
          const { data } = await api.get(`/appointments/${appointmentTypeId}`);
          if (!cancelled) setApt(data.data);
        }
      } catch {
        if (!cancelled) setApt(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [appointmentTypeId, token]);

  // ── Step 2 → 3: Reserve the slot first (payment-required only) ────────────
  const reserveAndContinue = useCallback(async () => {
    if (!slotPick || !resourceId || !apt) return;
    const needsHold = apt.advance_payment;

    if (!needsHold) {
      // Free / manual-confirm booking — skip hold, go straight to questions
      setStep(3);
      return;
    }

    // Release any previous hold before creating a new one
    if (hold) await releaseHold(hold);

    setHoldLoading(true);
    try {
      const { data } = await api.post('/bookings/hold', {
        appointment_type_id: apt.id,
        resource_id: resourceId,
        booking_date: slotPick.date,
        start_time: slotPick.start_time,
        end_time: slotPick.end_time,
        capacity_held: slotPick.capacity_booked || 1
      });
      const h = {
        hold_id: data.data.hold_id,
        expires_at: data.data.expires_at,
        timeout_minutes: data.data.hold_timeout_minutes
      };
      setHold(h);
      setStep(3);
    } catch (err) {
      show(err.response?.data?.message || 'Could not reserve this slot. It may have been taken.', 'error');
    } finally {
      setHoldLoading(false);
    }
  }, [slotPick, resourceId, apt, hold, releaseHold, show]);

  // Handle timer expiry
  const handleHoldExpired = useCallback(() => {
    show('⏰ Your reservation has expired. Please select a slot again.', 'error');
    setHold(null);
    setSlotPick(null);
    setStep(2);
  }, [show]);

  const onSlotSelected = useCallback((p) => setSlotPick(p), []);

  const canNext2 = resourceId && slotPick?.date && slotPick?.start_time;
  const canNext3 = useMemo(() => {
    if (!apt?.questions) return true;
    return apt.questions
      .filter((q) => q.is_required)
      .every((q) => (answers[q.id] || '').trim().length > 0);
  }, [apt, answers]);

  const submitBooking = async (withPay) => {
    if (!apt || !resourceId || !slotPick) return;
    setSubmitting(true);
    try {
      const ans = (apt.questions || []).map((q) => ({
        question_id: q.id,
        answer_text: answers[q.id] || ''
      }));
      const payload = {
        appointment_type_id: apt.id,
        resource_id: resourceId,
        booking_date: slotPick.date,
        start_time: slotPick.start_time,
        end_time: slotPick.end_time,
        capacity_booked: slotPick.capacity_booked || 1,
        answers: ans
      };
      // Include hold_id so backend can verify & consume the reservation
      if (hold?.hold_id) payload.hold_id = hold.hold_id;

      const { data } = await api.post('/bookings', payload);
      const booking = data.data;

      // Hold is consumed by backend; clear local state
      setHold(null);

      if (withPay && booking.payment_status === 'pending') {
        try {
          const paid = await completeBookingPayment(booking, {
            email: user?.email,
            description: apt.name
          });
          nav('/booking/confirm', { state: { booking: paid } });
        } catch (payErr) {
          show(
            payErr.response?.data?.message ||
              payErr.message ||
              'Payment could not be completed. Your booking is saved as pending — try again from My Bookings.',
            'error'
          );
          nav('/booking/confirm', { state: { booking } });
        }
      } else {
        nav('/booking/confirm', { state: { booking } });
      }
    } catch (err) {
      show(bookingErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!apt) {
    return (
      <div className="p-8 text-center">
        <p>Class not found.</p>
      </div>
    );
  }

  const resources = apt.resources || [];
  const stepLabels = ['Instructor', 'Date & Time', 'Questions', 'Review'];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* ── Hold Timer banner (shown from step 3 onward when hold is active) ── */}
      {hold && step >= 3 && (
        <div className="hold-timer-banner">
          <HoldTimer
            expiresAt={hold.expires_at}
            holdId={hold.hold_id}
            onExpired={handleHoldExpired}
          />
        </div>
      )}

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* ── Step indicators ── */}
        <div className="mb-8 flex flex-wrap gap-2 text-xs font-semibold text-zen-muted">
          {stepLabels.map((label, i) => {
            const s = i + 1;
            return (
              <span
                key={s}
                className={`rounded-full px-3 py-1 ${
                  step === s
                    ? 'bg-zen-primary text-white'
                    : step > s
                      ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                      : 'bg-white ring-1 ring-slate-200'
                }`}
              >
                {step > s ? '✓ ' : ''}{label}
              </span>
            );
          })}
        </div>

        {/* ── Step 1: Instructor ── */}
        {step === 1 && (
          <section>
            <h2 className="text-xl font-bold text-zen-ink">Who would you like to book with?</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {resources.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setResourceId(r.id)}
                  className={`rounded-card border p-4 text-left ${
                    resourceId === r.id ? 'border-zen-primary bg-zen-secondary' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="font-bold text-zen-ink">{r.resource_name}</div>
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={!resourceId}
                onClick={() => setStep(2)}
                className="rounded-control bg-zen-primary px-6 py-2 font-semibold text-white disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </section>
        )}

        {/* ── Step 2: Date & Time ── */}
        {step === 2 && (
          <section>
            <h2 className="text-xl font-bold text-zen-ink">Choose date &amp; time</h2>
            {apt.advance_payment && apt.hold_timeout_minutes && (
              <p className="mt-1 text-sm text-amber-600">
                ⏱ Once you reserve a slot, you have{' '}
                <strong>{apt.hold_timeout_minutes} minutes</strong> to complete payment.
              </p>
            )}
            <div className="mt-4 rounded-card bg-white p-4">
              <SlotPicker
                appointmentTypeId={resolvedId}
                resourceId={resourceId}
                manageCapacity={apt.manage_capacity}
                onSlotSelected={onSlotSelected}
              />
            </div>
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => { releaseHold(hold); setStep(1); }}
                className="text-sm font-semibold text-zen-primary"
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={!canNext2 || holdLoading}
                onClick={reserveAndContinue}
                className="rounded-control bg-zen-primary px-6 py-2 font-semibold text-white disabled:opacity-50"
              >
                {holdLoading
                  ? 'Reserving…'
                  : apt.advance_payment
                    ? '🔒 Reserve Slot →'
                    : 'Next →'}
              </button>
            </div>
          </section>
        )}

        {/* ── Step 3: Questions ── */}
        {step === 3 && (
          <section>
            <h2 className="text-xl font-bold text-zen-ink">Just a few quick questions</h2>
            <div className="mt-4 space-y-4">
              {(apt.questions || [])
                .slice()
                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                .map((q) => (
                  <div key={q.id}>
                    <label className="text-sm font-semibold text-zen-ink">
                      {q.question_text}
                      {q.is_required && <span className="text-zen-error"> *</span>}
                    </label>
                    {!q.is_required && <p className="text-xs text-zen-muted">(optional)</p>}
                    <textarea
                      rows={3}
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      className="mt-1 w-full rounded-control border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zen-primary"
                    />
                  </div>
                ))}
            </div>
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => { releaseHold(hold); setStep(2); }}
                className="text-sm font-semibold text-zen-primary"
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={!canNext3}
                onClick={() => setStep(4)}
                className="rounded-control bg-zen-primary px-6 py-2 font-semibold text-white disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </section>
        )}

        {/* ── Step 4: Review ── */}
        {step === 4 && (
          <section>
            <h2 className="text-xl font-bold text-zen-ink">Review your booking</h2>
            <div className="mt-4 rounded-card border-l-4 border-zen-primary bg-white p-6 shadow-sm">
              <p className="font-bold">{apt.name}</p>
              <p className="text-sm text-zen-muted">Date: {slotPick?.date}</p>
              <p className="text-sm text-zen-muted">
                Time: {slotPick?.start_time} – {slotPick?.end_time}
              </p>
              <p className="text-sm text-zen-muted">Seats: {slotPick?.capacity_booked || 1}</p>
              {hold && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-200">
                  <span>🔒</span>
                  <span>Slot reserved — complete payment before your timer runs out!</span>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-between gap-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-sm font-semibold text-zen-primary"
              >
                ← Back
              </button>
              {apt.advance_payment ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => submitBooking(true)}
                  className="rounded-control bg-zen-warning px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {submitting
                    ? 'Processing...'
                    : `Pay ₹${Number(apt.payment_amount).toLocaleString('en-IN')} & Confirm`}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => submitBooking(false)}
                  className="rounded-control bg-zen-primary px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {submitting ? 'Confirming...' : 'Confirm Booking'}
                </button>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
