// Mini calendar + slot grid — loads GET /bookings/slots; emits { date, start_time, end_time, capacity_booked }.
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axios.js';
import LoadingSpinner from './LoadingSpinner.jsx';

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export default function SlotPicker({ appointmentTypeId, resourceId, manageCapacity, onSlotSelected }) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState(null);
  const [capacity, setCapacity] = useState(1);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = startOfMonth(cursor).getDay();
  const totalDays = daysInMonth(year, month);

  const iso = (day) => {
    const dd = String(day).padStart(2, '0');
    const mm = String(month + 1).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (!selectedDate || !appointmentTypeId || !resourceId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/bookings/slots', {
          params: { appointmentTypeId, resourceId, date: selectedDate }
        });
        if (!cancelled) setSlots(data.data?.slots || []);
      } catch {
        if (!cancelled) setSlots([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, appointmentTypeId, resourceId]);

  const maxCap = useMemo(() => {
    const s = slots.find((x) => x.start_time === picked?.start_time && x.end_time === picked?.end_time);
    return s?.spots_remaining ?? 1;
  }, [slots, picked]);

  const emit = useCallback(
    (slot, cap) => {
      if (!slot || !selectedDate) return;
      onSlotSelected?.({
        date: selectedDate,
        start_time: slot.start_time,
        end_time: slot.end_time,
        capacity_booked: manageCapacity ? cap : 1
      });
    },
    [selectedDate, manageCapacity, onSlotSelected]
  );

  const cells = [];
  for (let i = 0; i < firstDow; i += 1) cells.push(null);
  for (let d = 1; d <= totalDays; d += 1) cells.push(d);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <button type="button" className="text-zen-primary" onClick={() => setCursor(new Date(year, month - 1, 1))}>
            ←
          </button>
          <p className="font-bold text-zen-ink">
            {cursor.toLocaleString('default', { month: 'long' })} {year}
          </p>
          <button type="button" className="text-zen-primary" onClick={() => setCursor(new Date(year, month + 1, 1))}>
            →
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-zen-muted">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((d, idx) =>
            d == null ? (
              <div key={`e-${idx}`} />
            ) : (
              <button
                key={d}
                type="button"
                disabled={new Date(year, month, d) < today}
                onClick={() => {
                  setSelectedDate(iso(d));
                  setPicked(null);
                  setCapacity(1);
                }}
                className={`rounded-control py-2 text-sm font-semibold ${
                  selectedDate === iso(d)
                    ? 'bg-zen-primary text-white'
                    : new Date(year, month, d) < today
                      ? 'cursor-not-allowed opacity-40'
                      : 'border border-slate-200 hover:border-zen-primary'
                } ${new Date(year, month, d).getTime() === today.getTime() ? 'ring-2 ring-zen-primary' : ''}`}
              >
                {d}
              </button>
            )
          )}
        </div>
      </div>
      <div>
        {!selectedDate && <p className="text-sm text-zen-muted">← Select a date to see available slots</p>}
        {selectedDate && loading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        )}
        {selectedDate && !loading && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.map((s) => {
              const active = picked?.start_time === s.start_time && picked?.end_time === s.end_time;
              return (
                <button
                  key={`${s.start_time}-${s.end_time}`}
                  type="button"
                  disabled={!s.available}
                  onClick={() => {
                    setPicked(s);
                    setCapacity(1);
                    emit(s, manageCapacity ? 1 : 1);
                  }}
                  className={`relative rounded-control border px-2 py-3 text-xs font-semibold ${
                    active
                      ? 'border-zen-primary bg-zen-primary text-white'
                      : s.available
                        ? 'border-zen-primary text-zen-primary hover:bg-zen-secondary'
                        : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through'
                  }`}
                >
                  {s.start_time} – {s.end_time}
                  {s.spots_remaining > 0 && s.spots_remaining < 99 && (
                    <span className="mt-1 block text-[10px] font-normal">{s.spots_remaining} spots left</span>
                  )}
                  {!s.available && <span className="mt-1 block text-[10px]">Booked</span>}
                </button>
              );
            })}
          </div>
        )}
        {manageCapacity && picked && picked.available && (
          <div className="mt-4 flex items-center gap-3 text-sm">
            <span>How many spots?</span>
            <button
              type="button"
              className="rounded border px-2"
              onClick={() =>
                setCapacity((c) => {
                  const n = Math.max(1, c - 1);
                  emit(picked, n);
                  return n;
                })
              }
            >
              −
            </button>
            <span className="font-bold">{capacity}</span>
            <button
              type="button"
              className="rounded border px-2"
              onClick={() =>
                setCapacity((c) => {
                  const n = Math.min(maxCap, c + 1);
                  emit(picked, n);
                  return n;
                })
              }
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
