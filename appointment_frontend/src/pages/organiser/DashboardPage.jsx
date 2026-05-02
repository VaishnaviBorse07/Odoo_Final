import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import api from '../../api/axios.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import { useToast } from '../../components/Toast.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { useAuth } from '../../hooks/useAuth.js';

const STATUS_FILTERS = ['all', 'published', 'draft', 'unpublished'];

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  });
}

function formatTime(value) {
  if (!value) return '--';
  return String(value).slice(0, 5);
}

function OrganiserMonthGrid({ year, month, counts, events }) {
  const firstDow = new Date(year, month - 1, 1).getDay();
  const totalDays = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i += 1) cells.push(null);
  for (let d = 1; d <= totalDays; d += 1) cells.push(d);
  const iso = (day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return (
    <div className="mt-4">
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-zen-muted">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, idx) =>
          d == null ? (
            <div key={`e-${idx}`} />
          ) : (
            <div
              key={d}
              className="min-h-[52px] rounded border border-slate-100 bg-slate-50/80 p-1 text-left text-[11px]"
            >
              <div className="font-bold text-zen-ink">{d}</div>
              {counts[iso(d)] ? (
                <div className="mt-0.5 text-[10px] font-semibold text-zen-primary">
                  {counts[iso(d)]} booking(s)
                </div>
              ) : null}
            </div>
          )
        )}
      </div>
      {events.length > 0 && (
        <div className="mt-4 max-h-44 space-y-1 overflow-y-auto text-xs text-zen-muted">
          {events.slice(0, 14).map((ev) => (
            <div key={`${ev.booking_id}-${String(ev.start_time)}`}>
              <span className="font-semibold text-zen-ink">{String(ev.booking_date).slice(0, 10)}</span>{' '}
              {formatTime(ev.start_time)} · {ev.service_name} — {ev.customer_name}{' '}
              <span className="text-zen-muted">({ev.booking_status})</span>
            </div>
          ))}
          {events.length > 14 && <p className="text-[10px]">+{events.length - 14} more in this month…</p>}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, tone = 'default', detail }) {
  const tones = {
    default: 'border-slate-200 bg-white text-zen-ink',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
    blue: 'border-sky-200 bg-sky-50 text-sky-950'
  };

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${tones[tone] || tones.default}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

function QuickAction({ to, label, detail, primary = false }) {
  return (
    <Link
      to={to}
      className={`block rounded-lg border p-4 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        primary
          ? 'border-zen-primary bg-zen-primary text-white'
          : 'border-slate-200 bg-white text-zen-ink hover:border-zen-primary/40'
      }`}
    >
      <span className="font-extrabold">{label}</span>
      <span className={`mt-1 block text-xs ${primary ? 'text-white/80' : 'text-zen-muted'}`}>{detail}</span>
    </Link>
  );
}

function EmptyState({ hasSearch }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <h2 className="text-lg font-extrabold text-zen-ink">
        {hasSearch ? 'No classes match this view' : 'Create your first class'}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-zen-muted">
        {hasSearch
          ? 'Adjust the filters or search text to bring classes back into view.'
          : 'Set duration, location, resources, booking rules, and publish when it is ready.'}
      </p>
      {!hasSearch && (
        <Link
          to="/organiser/new"
          className="mt-5 inline-flex rounded-control bg-zen-primary px-5 py-2 text-sm font-bold text-white hover:bg-zen-accent"
        >
          New Class
        </Link>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { show } = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [overview, setOverview] = useState(null);
  const [peak, setPeak] = useState([]);
  const [providers, setProviders] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const calNow = new Date();
  const [calYear, setCalYear] = useState(calNow.getFullYear());
  const [calMonth, setCalMonth] = useState(calNow.getMonth() + 1);
  const [calEvents, setCalEvents] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/bookings/organiser-calendar', {
          params: { year: calYear, month: calMonth }
        });
        if (!cancelled) setCalEvents(data.data?.events || []);
      } catch {
        if (!cancelled) setCalEvents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [calYear, calMonth]);

  const calCounts = useMemo(() => {
    const m = {};
    for (const ev of calEvents) {
      const ds = String(ev.booking_date).slice(0, 10);
      m[ds] = (m[ds] || 0) + 1;
    }
    return m;
  }, [calEvents]);

  const bumpCal = (delta) => {
    let m = calMonth + delta;
    let y = calYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setCalMonth(m);
    setCalYear(y);
  };

  const load = async () => {
    const [appointmentsRes, overviewRes, peakRes, providerRes] = await Promise.allSettled([
      api.get('/appointments/mine'),
      api.get('/reports/overview'),
      api.get('/reports/peak-hours'),
      api.get('/reports/provider-utilization')
    ]);

    if (appointmentsRes.status === 'fulfilled') {
      setItems(appointmentsRes.value.data.data?.appointments || []);
    } else {
      setItems([]);
      setError('Could not load dashboard classes.');
    }

    setOverview(overviewRes.status === 'fulfilled' ? overviewRes.value.data.data || {} : {});
    setPeak(peakRes.status === 'fulfilled' ? peakRes.value.data.data || [] : []);
    setProviders(providerRes.status === 'fulfilled' ? providerRes.value.data.data || [] : []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch {
        if (!cancelled) setError('Dashboard data is temporarily unavailable.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = useMemo(() => {
    const published = items.filter((a) => a.status === 'published').length;
    const draft = items.filter((a) => a.status === 'draft').length;
    const unpublished = items.filter((a) => a.status === 'unpublished').length;
    const upcoming = items.reduce((sum, a) => sum + Number(a.upcoming_count || 0), 0);
    const paidValue = items.reduce((sum, a) => {
      if (!a.advance_payment) return sum;
      return sum + Number(a.payment_amount || 0) * Number(a.upcoming_count || 0);
    }, 0);

    return {
      published,
      draft,
      unpublished,
      upcoming,
      paidValue
    };
  }, [items]);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return items.filter((a) => {
      const matchesText =
        !text ||
        [a.name, a.location, a.organiser_name, a.slot_type, a.confirmation_type]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(text));
      const matchesStatus = status === 'all' || a.status === status;
      return matchesText && matchesStatus;
    });
  }, [items, q, status]);

  const topClasses = useMemo(
    () =>
      [...items]
        .sort((a, b) => Number(b.upcoming_count || 0) - Number(a.upcoming_count || 0))
        .slice(0, 3),
    [items]
  );

  const toggle = async (id, currentStatus) => {
    const next = currentStatus === 'published' ? 'unpublished' : 'published';
    setBusyId(id);
    try {
      await api.patch(`/appointments/${id}/status`, { status: next });
      show(`Class ${next === 'published' ? 'published' : 'unpublished'}`, 'success');
      await load();
    } catch (err) {
      show(err.response?.data?.message || 'Could not update class status', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const share = async (token) => {
    const url = `${window.location.origin}/book/share/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      show('Booking link copied', 'success');
    } catch {
      show(url, 'info');
    }
  };

  const greetingName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-zen-primary">Organiser dashboard</p>
            <h1 className="mt-2 text-3xl font-extrabold text-zen-ink">Welcome back, {greetingName}</h1>
            <p className="mt-2 max-w-2xl text-sm text-zen-muted">
              Track classes, booking demand, resource load, and publish status from one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/organiser/reports"
              className="rounded-control border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-zen-ink hover:border-zen-primary"
            >
              Reports
            </Link>
            <Link
              to="/organiser/new"
              className="rounded-control bg-zen-primary px-5 py-2 text-sm font-bold text-white hover:bg-zen-accent"
            >
              New Class
            </Link>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Classes" value={items.length} detail={`${metrics.published} published`} />
              <StatCard label="Upcoming" value={metrics.upcoming} tone="green" detail="Booked future sessions" />
              <StatCard label="Pending" value={overview?.pending_bookings ?? 0} tone="amber" detail="Need attention" />
              <StatCard label="Confirmed" value={overview?.confirmed_bookings ?? 0} tone="blue" detail="Ready to attend" />
              <StatCard label="Expected" value={formatMoney(metrics.paidValue)} detail="Advance value estimate" />
            </section>

            <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-extrabold uppercase tracking-wide text-zen-ink">Booking calendar</h2>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => bumpCal(-1)} className="rounded-control border px-3 py-1 text-sm font-bold">
                    ←
                  </button>
                  <span className="text-sm font-semibold text-zen-ink">
                    {new Date(calYear, calMonth - 1, 1).toLocaleString('default', { month: 'long' })} {calYear}
                  </span>
                  <button type="button" onClick={() => bumpCal(1)} className="rounded-control border px-3 py-1 text-sm font-bold">
                    →
                  </button>
                </div>
              </div>
              <OrganiserMonthGrid year={calYear} month={calMonth} counts={calCounts} events={calEvents} />
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                    <input
                      placeholder="Search classes, location, type..."
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="min-h-11 w-full rounded-control border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zen-primary"
                    />
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="min-h-11 rounded-control border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-zen-primary"
                    >
                      {STATUS_FILTERS.map((option) => (
                        <option key={option} value={option}>
                          {option === 'all' ? 'All statuses' : option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-sm font-semibold text-zen-muted">{filtered.length} shown</p>
                </div>

                <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  {filtered.length === 0 ? (
                    <div className="p-4">
                      <EmptyState hasSearch={Boolean(q || status !== 'all')} />
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filtered.map((a) => (
                        <article key={a.id} className="p-4 transition hover:bg-slate-50">
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h2 className="truncate text-lg font-extrabold text-zen-ink">{a.name}</h2>
                                <StatusBadge status={a.status} />
                              </div>
                              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-zen-muted">
                                <span>{a.duration_minutes} min</span>
                                <span>{a.location || 'Location pending'}</span>
                                <span>{a.resource_count || 0} resources</span>
                                <span>{a.question_count || 0} questions</span>
                                <span>{a.upcoming_count || 0} upcoming</span>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {(a.resources || []).slice(0, 4).map((resource) => (
                                  <span
                                    key={resource.id}
                                    className="rounded-full bg-zen-secondary px-2 py-1 text-xs font-bold text-zen-primary"
                                  >
                                    {resource.resource_name}
                                  </span>
                                ))}
                                {(a.resources || []).length > 4 && (
                                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                                    +{a.resources.length - 4} more
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                              <button
                                type="button"
                                onClick={() => share(a.share_token)}
                                className="rounded-control border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-zen-ink hover:border-zen-primary"
                              >
                                Copy Link
                              </button>
                              <Link
                                to={`/organiser/bookings/${a.id}`}
                                className="rounded-control border border-slate-200 bg-white px-3 py-2 text-center text-xs font-bold text-zen-ink hover:border-zen-primary"
                              >
                                Bookings
                              </Link>
                              <Link
                                to={`/organiser/edit/${a.id}`}
                                className="rounded-control border border-slate-200 bg-white px-3 py-2 text-center text-xs font-bold text-zen-ink hover:border-zen-primary"
                              >
                                Edit
                              </Link>
                              <Link
                                to={a.status === 'published' ? `/classes/${a.id}` : `/book/share/${a.share_token}`}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-control border border-slate-200 bg-white px-3 py-2 text-center text-xs font-bold text-zen-ink hover:border-zen-primary"
                              >
                                Preview
                              </Link>
                              <button
                                type="button"
                                disabled={busyId === a.id}
                                onClick={() => toggle(a.id, a.status)}
                                className="rounded-control bg-zen-primary px-3 py-2 text-xs font-bold text-white hover:bg-zen-accent disabled:opacity-60"
                              >
                                {busyId === a.id ? 'Saving' : a.status === 'published' ? 'Unpublish' : 'Publish'}
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <aside className="space-y-4">
                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-sm font-extrabold uppercase tracking-wide text-zen-ink">Quick actions</h2>
                  <div className="mt-3 grid gap-3">
                    <QuickAction to="/organiser/new" label="Create class" detail="Add booking rules and resources" primary />
                    <QuickAction to="/organiser/reports" label="Open reports" detail="Review booking performance" />
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-sm font-extrabold uppercase tracking-wide text-zen-ink">Status mix</h2>
                  <div className="mt-4 space-y-3 text-sm">
                    {[
                      ['Published', metrics.published, 'bg-emerald-500'],
                      ['Draft', metrics.draft, 'bg-amber-500'],
                      ['Unpublished', metrics.unpublished, 'bg-slate-500']
                    ].map(([label, value, color]) => {
                      const percent = items.length ? Math.round((Number(value) / items.length) * 100) : 0;
                      return (
                        <div key={label}>
                          <div className="flex justify-between font-semibold text-zen-ink">
                            <span>{label}</span>
                            <span>{value}</span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-sm font-extrabold uppercase tracking-wide text-zen-ink">Top classes</h2>
                  <div className="mt-3 space-y-3">
                    {topClasses.length === 0 ? (
                      <p className="text-sm text-zen-muted">No booking data yet.</p>
                    ) : (
                      topClasses.map((a) => (
                        <div key={a.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate font-semibold text-zen-ink">{a.name}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                            {a.upcoming_count || 0}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-sm font-extrabold uppercase tracking-wide text-zen-ink">Peak hours</h2>
                  <div className="mt-3 space-y-3">
                    {peak.length === 0 ? (
                      <p className="text-sm text-zen-muted">No peak-hour data yet.</p>
                    ) : (
                      peak.slice(0, 4).map((row) => (
                        <div key={`${row.start_time}-${row.booking_count}`} className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-zen-ink">{formatTime(row.start_time)}</span>
                          <span className="text-zen-muted">{row.booking_count} bookings</span>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-sm font-extrabold uppercase tracking-wide text-zen-ink">Resource load</h2>
                  <div className="mt-3 space-y-3">
                    {providers.length === 0 ? (
                      <p className="text-sm text-zen-muted">No resource data yet.</p>
                    ) : (
                      providers.slice(0, 4).map((row) => (
                        <div key={row.resource_name} className="text-sm">
                          <div className="flex justify-between gap-3">
                            <span className="truncate font-semibold text-zen-ink">{row.resource_name}</span>
                            <span className="text-zen-muted">{row.total_sessions_booked || 0}</span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full bg-zen-primary"
                              style={{
                                width: `${Math.min(100, Number(row.total_sessions_booked || 0) * 12)}%`
                              }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </aside>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
