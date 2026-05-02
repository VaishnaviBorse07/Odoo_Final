// Set weekly working hours for one resource — POST /api/resources/:id/working-hours.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import api from '../../api/axios.js';
import { useToast } from '../../components/Toast.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

const DAYS = [
  { dow: 0, label: 'Sun' },
  { dow: 1, label: 'Mon' },
  { dow: 2, label: 'Tue' },
  { dow: 3, label: 'Wed' },
  { dow: 4, label: 'Thu' },
  { dow: 5, label: 'Fri' },
  { dow: 6, label: 'Sat' }
];

export default function WorkingHoursPage() {
  const { id } = useParams();
  const { show } = useToast();
  const [rows, setRows] = useState(() =>
    DAYS.map((d) => ({ day_of_week: d.dow, start_time: '09:00', end_time: '10:00', is_available: false }))
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/appointments/mine`);
        const list = data.data?.appointments || [];
        for (const apt of list) {
          const res = (apt.resources || []).find((r) => String(r.id) === String(id));
          if (res) {
            const full = await api.get(`/appointments/${apt.id}`);
            const r = (full.data.data?.resources || []).find((x) => String(x.id) === String(id));
            if (!cancelled && r?.working_hours?.length) {
              const map = new Map(r.working_hours.map((w) => [w.day_of_week, w]));
              setRows(
                DAYS.map((d) => {
                  const ex = map.get(d.dow);
                  return ex
                    ? {
                        day_of_week: ex.day_of_week,
                        start_time: String(ex.start_time).slice(0, 5),
                        end_time: String(ex.end_time).slice(0, 5),
                        is_available: ex.is_available
                      }
                    : { day_of_week: d.dow, start_time: '09:00', end_time: '10:00', is_available: false };
                })
              );
            }
            break;
          }
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const save = async () => {
    setLoading(true);
    try {
      const payload = rows
        .filter((r) => r.is_available)
        .map((r) => ({
          day_of_week: r.day_of_week,
          start_time: r.start_time.length === 5 ? `${r.start_time}:00` : r.start_time,
          end_time: r.end_time.length === 5 ? `${r.end_time}:00` : r.end_time,
          is_available: true
        }));
      await api.post(`/resources/${id}/working-hours`, payload);
      show('Working hours saved', 'success');
    } catch (e) {
      show(e.response?.data?.message || 'Save failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-lg px-4 py-8">
        <Link to="/organiser" className="text-sm text-zen-primary">
          ← Back
        </Link>
        <h1 className="mt-4 text-xl font-bold">Working hours</h1>
        <p className="mt-1 text-sm text-zen-muted">Toggle days and set start/end (24h).</p>
        <div className="mt-6 space-y-3 rounded-card bg-white p-4 shadow">
          {rows.map((r, idx) => (
            <div key={r.day_of_week} className="flex flex-wrap items-center gap-2 border-b border-slate-100 py-2">
              <label className="flex w-16 items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={r.is_available}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...r, is_available: e.target.checked };
                    setRows(next);
                  }}
                />
                {DAYS[idx].label}
              </label>
              <input
                type="time"
                className="rounded border px-2 py-1 text-sm"
                value={r.start_time}
                onChange={(e) => {
                  const next = [...rows];
                  next[idx] = { ...r, start_time: e.target.value };
                  setRows(next);
                }}
              />
              <span className="text-zen-muted">to</span>
              <input
                type="time"
                className="rounded border px-2 py-1 text-sm"
                value={r.end_time}
                onChange={(e) => {
                  const next = [...rows];
                  next[idx] = { ...r, end_time: e.target.value };
                  setRows(next);
                }}
              />
            </div>
          ))}
          <button
            type="button"
            disabled={loading}
            onClick={save}
            className="mt-4 w-full rounded-control bg-zen-primary py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? <LoadingSpinner /> : 'Save schedule'}
          </button>
        </div>
      </main>
    </div>
  );
}
