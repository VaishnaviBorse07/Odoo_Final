/**
 * WorkingHoursPage — multiple time slots per day, auto-generated from appointment duration.
 *
 * Features:
 *  - Shows resource name + appointment duration at the top
 *  - Each day can be toggled ON/OFF
 *  - Each enabled day shows all its slots as chips (e.g. 06:00–07:00, 07:00–08:00)
 *  - "Add slot" button opens a small form to pick start time; end time auto-calculated from duration
 *  - Slots can be deleted individually per day
 *  - "Save schedule" sends all slots (every enabled day's slots) to the backend in one call
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import api from '../../api/axios.js';
import { useToast } from '../../components/Toast.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

const DAYS = [
  { dow: 0, label: 'Sunday',    short: 'Sun' },
  { dow: 1, label: 'Monday',    short: 'Mon' },
  { dow: 2, label: 'Tuesday',   short: 'Tue' },
  { dow: 3, label: 'Wednesday', short: 'Wed' },
  { dow: 4, label: 'Thursday',  short: 'Thu' },
  { dow: 5, label: 'Friday',    short: 'Fri' },
  { dow: 6, label: 'Saturday',  short: 'Sat' },
];

// "HH:MM" → total minutes from midnight
function toMins(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// total minutes → "HH:MM"
function fromMins(m) {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// "HH:MM:SS" or "HH:MM" → "HH:MM"
function fmt(t) {
  return String(t || '').slice(0, 5);
}

// Check if two [start,end] ranges overlap
function overlaps(s1, e1, s2, e2) {
  return toMins(s1) < toMins(e2) && toMins(e1) > toMins(s2);
}

// Build initial per-day state from DB working_hours rows
function buildDayState(existingRows) {
  // dayState: { [dow]: { enabled: bool, slots: [{id?, start, end}] } }
  const state = {};
  DAYS.forEach((d) => { state[d.dow] = { enabled: false, slots: [] }; });
  existingRows.forEach((row) => {
    const dow = row.day_of_week;
    if (!state[dow]) state[dow] = { enabled: false, slots: [] };
    state[dow].enabled = true;
    state[dow].slots.push({ id: row.id, start: fmt(row.start_time), end: fmt(row.end_time) });
  });
  return state;
}

export default function WorkingHoursPage() {
  const { id: resourceId, aptId } = useParams();
  const { show } = useToast();

  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [resourceName, setResourceName] = useState('');
  const [aptName, setAptName]     = useState('');
  const [duration, setDuration]   = useState(60); // minutes
  const [dayState, setDayState]   = useState(() => buildDayState([]));

  // addForm: { [dow]: { start: 'HH:MM' } }  — one per day (collapsed after adding)
  const [addForm, setAddForm]     = useState({});

  // ── Load existing data ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // If we have aptId in the route, fetch directly — much faster
        const { data: full } = await api.get(`/appointments/${aptId}`);
        const apt = full.data;
        const fullRes = (apt?.resources || []).find((x) => String(x.id) === String(resourceId));
        if (!cancelled) {
          setAptName(apt?.name || '');
          setDuration(apt?.duration_minutes || 60);
          setResourceName(fullRes?.resource_name || '');
          if (fullRes?.working_hours?.length) {
            setDayState(buildDayState(fullRes.working_hours));
          }
        }
      } catch {
        // fallback: search all appointments
        try {
          const { data: aptsData } = await api.get('/appointments/mine');
          const apts = aptsData.data?.appointments || [];
          for (const apt of apts) {
            const res = (apt.resources || []).find((r) => String(r.id) === String(resourceId));
            if (res) {
              const { data: full } = await api.get(`/appointments/${apt.id}`);
              const fullRes = (full.data?.resources || []).find((x) => String(x.id) === String(resourceId));
              if (!cancelled) {
                setAptName(apt.name || '');
                setDuration(apt.duration_minutes || 60);
                setResourceName(fullRes?.resource_name || res.resource_name || '');
                if (fullRes?.working_hours?.length) {
                  setDayState(buildDayState(fullRes.working_hours));
                }
              }
              break;
            }
          }
        } catch { /* ignore */ }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [resourceId, aptId]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toggleDay = (dow) => {
    setDayState((prev) => ({
      ...prev,
      [dow]: { ...prev[dow], enabled: !prev[dow].enabled }
    }));
  };

  const removeSlot = (dow, idx) => {
    setDayState((prev) => {
      const slots = prev[dow].slots.filter((_, i) => i !== idx);
      return { ...prev, [dow]: { ...prev[dow], slots, enabled: slots.length > 0 ? prev[dow].enabled : false } };
    });
  };

  const openAddForm = (dow) => {
    // Default start = last slot end time, or 06:00
    const existingSlots = dayState[dow]?.slots || [];
    const defaultStart = existingSlots.length
      ? existingSlots[existingSlots.length - 1].end
      : '06:00';
    setAddForm((prev) => ({ ...prev, [dow]: { start: defaultStart } }));
  };

  const confirmAddSlot = (dow) => {
    const form = addForm[dow];
    if (!form?.start) return;
    const startMins = toMins(form.start);
    const endMins   = startMins + duration;
    if (endMins > 24 * 60) {
      show('Slot goes past midnight — choose an earlier start time.', 'error');
      return;
    }
    const start = form.start;
    const end   = fromMins(endMins);

    // Check overlap with existing slots for this day
    const existing = dayState[dow]?.slots || [];
    for (const s of existing) {
      if (overlaps(start, end, s.start, s.end)) {
        show(`Overlaps with existing slot ${s.start}–${s.end}`, 'error');
        return;
      }
    }

    setDayState((prev) => ({
      ...prev,
      [dow]: {
        enabled: true,
        slots: [...(prev[dow]?.slots || []), { start, end }].sort(
          (a, b) => toMins(a.start) - toMins(b.start)
        )
      }
    }));
    // Advance form to next slot
    setAddForm((prev) => ({ ...prev, [dow]: { start: end } }));
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true);
    try {
      const payload = [];
      DAYS.forEach((d) => {
        const ds = dayState[d.dow];
        if (!ds?.enabled) return;
        (ds.slots || []).forEach((slot) => {
          payload.push({
            day_of_week:  d.dow,
            start_time:   slot.start.length === 5 ? `${slot.start}:00` : slot.start,
            end_time:     slot.end.length === 5   ? `${slot.end}:00`   : slot.end,
            is_available: true,
          });
        });
      });

      if (payload.length === 0) {
        show('Enable at least one day with slots before saving.', 'error');
        setSaving(false);
        return;
      }

      await api.post(`/resources/${resourceId}/working-hours`, payload);
      show(`✅ Schedule saved — ${payload.length} slot${payload.length !== 1 ? 's' : ''} saved!`, 'success');
    } catch (e) {
      let msg = 'Save failed — check backend.';
      if (e.response?.data) {
        if (e.response.data.message) msg = e.response.data.message;
        else if (e.response.data.detail) {
          msg = Array.isArray(e.response.data.detail) 
            ? e.response.data.detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ')
            : JSON.stringify(e.response.data.detail);
        } else {
          msg = typeof e.response.data === 'string' ? e.response.data.slice(0, 100) : JSON.stringify(e.response.data);
        }
      } else {
        msg = e.message;
      }
      show(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const totalSlots = DAYS.reduce((acc, d) => acc + (dayState[d.dow]?.slots?.length || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8">

        {/* Back */}
        <Link
          to={aptId ? `/organiser/appointments/${aptId}/resources` : '/organiser'}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#0F6E56] hover:underline"
        >
          ← Back to Resources
        </Link>

        {/* Header */}
        <div className="mt-4 rounded-2xl bg-gradient-to-r from-[#0F6E56] to-[#1D9E75] p-5 text-white shadow-md">
          <p className="text-xs font-bold uppercase tracking-widest text-white/70">Working Hours</p>
          <h1 className="mt-1 text-2xl font-extrabold">{resourceName || 'Instructor'}</h1>
          {aptName && <p className="mt-1 text-sm text-white/80">📅 {aptName}</p>}
          <div className="mt-3 flex flex-wrap gap-3">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              ⏱ {duration} min/session
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              🗓 {totalSlots} slot{totalSlots !== 1 ? 's' : ''} configured
            </span>
          </div>
        </div>

        {/* Info box */}
        <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
          <strong>How it works:</strong> Enable days, then click <strong>+ Add Slot</strong> to add time slots.
          Each slot is exactly <strong>{duration} minutes</strong> long. You can add multiple slots per day
          (e.g. 07:00–08:00, 09:00–10:00).
        </div>

        {/* Day cards */}
        <div className="mt-5 space-y-3">
          {DAYS.map((d) => {
            const ds = dayState[d.dow] || { enabled: false, slots: [] };
            const form = addForm[d.dow];

            return (
              <div
                key={d.dow}
                className={`rounded-2xl border bg-white shadow-sm transition-all ${
                  ds.enabled ? 'border-[#0F6E56]/30' : 'border-slate-100'
                }`}
              >
                {/* Day header row */}
                <div className="flex items-center justify-between px-4 py-3">
                  <label className="flex cursor-pointer items-center gap-3">
                    {/* Toggle switch */}
                    <div
                      onClick={() => toggleDay(d.dow)}
                      className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
                        ds.enabled ? 'bg-[#0F6E56]' : 'bg-slate-200'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                          ds.enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${ds.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                        {d.label}
                      </p>
                      {ds.enabled && ds.slots.length > 0 && (
                        <p className="text-xs text-gray-400">{ds.slots.length} slot{ds.slots.length !== 1 ? 's' : ''}</p>
                      )}
                    </div>
                  </label>

                  {/* Add slot button */}
                  {ds.enabled && !form && (
                    <button
                      type="button"
                      onClick={() => openAddForm(d.dow)}
                      className="flex items-center gap-1 rounded-xl bg-[#E1F5EE] px-3 py-1.5 text-xs font-bold text-[#0F6E56] hover:bg-[#0F6E56] hover:text-white transition-colors"
                    >
                      + Add Slot
                    </button>
                  )}
                </div>

                {/* Existing slots */}
                {ds.enabled && ds.slots.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-4 pb-3">
                    {ds.slots.map((slot, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 rounded-xl bg-[#E1F5EE] border border-[#0F6E56]/20 px-3 py-1.5"
                      >
                        <span className="text-xs font-bold text-[#0F6E56]">
                          {slot.start} – {slot.end}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSlot(d.dow, idx)}
                          className="flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 text-[10px] font-bold leading-none"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add slot form */}
                {ds.enabled && form && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Start time</label>
                      <input
                        type="time"
                        value={form.start}
                        onChange={(e) =>
                          setAddForm((prev) => ({ ...prev, [d.dow]: { start: e.target.value } }))
                        }
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">End time</label>
                      <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 px-3 py-2">
                        <span className="text-sm font-semibold text-gray-500">
                          {form.start
                            ? fromMins(Math.min(toMins(form.start) + duration, 24 * 60 - 1))
                            : '—'}
                        </span>
                        <span className="ml-2 text-[10px] text-gray-400">(auto)</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => confirmAddSlot(d.dow)}
                        className="rounded-xl bg-[#0F6E56] px-4 py-2 text-xs font-bold text-white hover:bg-[#1D9E75] transition"
                      >
                        ✓ Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddForm((prev) => { const n = { ...prev }; delete n[d.dow]; return n; })}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-gray-500 hover:bg-slate-100 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {ds.enabled && ds.slots.length === 0 && !form && (
                  <p className="px-4 pb-3 text-xs text-gray-400">
                    No slots yet — click <strong>+ Add Slot</strong> to add one.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Save button */}
        <div className="mt-6 flex items-center justify-between rounded-2xl bg-white border border-slate-100 px-5 py-4 shadow-sm">
          <div>
            <p className="text-sm font-bold text-gray-900">{totalSlots} slot{totalSlots !== 1 ? 's' : ''} ready to save</p>
            <p className="text-xs text-gray-400">All days and slots will be replaced on save.</p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="flex items-center gap-2 rounded-xl bg-[#0F6E56] px-6 py-2.5 text-sm font-extrabold text-white hover:bg-[#1D9E75] disabled:opacity-50 transition shadow-md"
          >
            {saving ? (
              <><LoadingSpinner size="sm" /> Saving…</>
            ) : (
              '💾 Save Schedule'
            )}
          </button>
        </div>

      </main>
    </div>
  );
}
