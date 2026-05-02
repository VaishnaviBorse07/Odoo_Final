import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import api from '../../api/axios.js';
import SlotPicker from '../../components/SlotPicker.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { useToast } from '../../components/Toast.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { completeBookingPayment } from '../../utils/completeBookingPayment.js';

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
    return () => {
      cancelled = true;
    };
  }, [appointmentTypeId, token]);

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
      const { data } = await api.post('/bookings', {
        appointment_type_id: apt.id,
        resource_id: resourceId,
        booking_date: slotPick.date,
        start_time: slotPick.start_time,
        end_time: slotPick.end_time,
        capacity_booked: slotPick.capacity_booked || 1,
        answers: ans
      });
      const booking = data.data;
      if (withPay && booking.payment_status === 'pending') {
        const paid = await completeBookingPayment(booking, {
          email: user?.email,
          description: apt.name
        });
        nav('/booking/confirm', { state: { booking: paid } });
      } else {
        nav('/booking/confirm', { state: { booking } });
      }
    } catch (err) {
      show(err.response?.data?.message || err.message || 'Booking failed', 'error');
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

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex flex-wrap gap-2 text-xs font-semibold text-zen-muted">
          {[1, 2, 3, 4].map((s) => (
            <span
              key={s}
              className={`rounded-full px-3 py-1 ${step === s ? 'bg-zen-primary text-white' : 'bg-white ring-1 ring-slate-200'}`}
            >
              Step {s}
            </span>
          ))}
        </div>
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
        {step === 2 && (
          <section>
            <h2 className="text-xl font-bold text-zen-ink">Choose date &amp; time</h2>
            <div className="mt-4 rounded-card bg-white p-4">
              <SlotPicker
                appointmentTypeId={resolvedId}
                resourceId={resourceId}
                manageCapacity={apt.manage_capacity}
                onSlotSelected={onSlotSelected}
              />
            </div>
            <div className="mt-6 flex justify-between">
              <button type="button" onClick={() => setStep(1)} className="text-sm font-semibold text-zen-primary">
                ← Back
              </button>
              <button
                type="button"
                disabled={!canNext2}
                onClick={() => setStep(3)}
                className="rounded-control bg-zen-primary px-6 py-2 font-semibold text-white disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </section>
        )}
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
              <button type="button" onClick={() => setStep(2)} className="text-sm font-semibold text-zen-primary">
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
            </div>
            <div className="mt-6 flex justify-between gap-4">
              <button type="button" onClick={() => setStep(3)} className="text-sm font-semibold text-zen-primary">
                ← Back
              </button>
              {apt.advance_payment ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => submitBooking(true)}
                  className="rounded-control bg-zen-warning px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {submitting ? 'Processing...' : `Pay ₹${Number(apt.payment_amount).toLocaleString('en-IN')} & Confirm`}
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
