// Admin system stats - GET /api/admin/stats.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import api from '../../api/axios.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

function StatTile({ label, value, detail, tone = 'default' }) {
  const tones = {
    default: 'border-slate-200 bg-white text-zen-ink',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
    blue: 'border-sky-200 bg-sky-50 text-sky-950'
  };

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${tones[tone] || tones.default}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-extrabold">{value ?? 0}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

function RatioBar({ label, value, total, color }) {
  const percent = total ? Math.round((Number(value || 0) / Number(total)) * 100) : 0;

  return (
    <div>
      <div className="flex justify-between text-sm font-semibold text-zen-ink">
        <span>{label}</span>
        <span>{value ?? 0}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/admin/stats');
        if (!cancelled) setStats(data.data || {});
      } catch {
        if (!cancelled) {
          setStats({});
          setError('Could not load admin statistics.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const bookingConversion = useMemo(() => {
    if (!stats?.total_bookings) return 0;
    return Math.round((Number(stats.total_confirmed_bookings || 0) / Number(stats.total_bookings)) * 100);
  }, [stats]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-zen-primary">Admin dashboard</p>
            <h1 className="mt-2 text-3xl font-extrabold text-zen-ink">System overview</h1>
            <p className="mt-2 max-w-2xl text-sm text-zen-muted">
              Monitor users, classes, booking activity, and platform readiness from one view.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/admin/users"
              className="rounded-control bg-zen-primary px-5 py-2 text-sm font-bold text-white hover:bg-zen-accent"
            >
              Manage Users
            </Link>
            <Link
              to="/organiser"
              className="rounded-control border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-zen-ink hover:border-zen-primary"
            >
              Classes
            </Link>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {error}
          </div>
        )}

        {!stats ? (
          <div className="flex justify-center py-24">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatTile label="Users" value={stats.total_users} detail={`${stats.total_customers || 0} customers`} />
              <StatTile label="Organisers" value={stats.total_organisers} tone="blue" detail="Can manage classes" />
              <StatTile
                label="Classes"
                value={stats.total_appointment_types}
                detail={`${stats.total_published_appointments || 0} published`}
              />
              <StatTile label="Bookings" value={stats.total_bookings} tone="green" detail={`${bookingConversion}% confirmed`} />
              <StatTile label="Today" value={stats.total_bookings_today} tone="amber" detail="Bookings dated today" />
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold text-zen-ink">Platform composition</h2>
                    <p className="text-sm text-zen-muted">Users and classes currently active in the system.</p>
                  </div>
                  <Link to="/admin/users" className="text-sm font-bold text-zen-primary hover:underline">
                    View users
                  </Link>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <RatioBar
                      label="Customers"
                      value={stats.total_customers}
                      total={stats.total_users}
                      color="bg-emerald-500"
                    />
                    <RatioBar
                      label="Organisers"
                      value={stats.total_organisers}
                      total={stats.total_users}
                      color="bg-sky-500"
                    />
                    <RatioBar label="Admins" value={stats.total_admins} total={stats.total_users} color="bg-slate-500" />
                  </div>

                  <div className="space-y-4">
                    <RatioBar
                      label="Published classes"
                      value={stats.total_published_appointments}
                      total={stats.total_appointment_types}
                      color="bg-zen-primary"
                    />
                    <RatioBar
                      label="Confirmed bookings"
                      value={stats.total_confirmed_bookings}
                      total={stats.total_bookings}
                      color="bg-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <aside className="space-y-4">
                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-extrabold uppercase tracking-wide text-zen-ink">Admin actions</h2>
                  <div className="mt-4 grid gap-3">
                    <Link
                      to="/admin/users"
                      className="rounded-lg border border-slate-200 p-4 text-sm font-bold text-zen-ink hover:border-zen-primary"
                    >
                      Manage user access
                      <span className="mt-1 block text-xs font-semibold text-zen-muted">Roles, active status, and lookup</span>
                    </Link>
                    <Link
                      to="/organiser"
                      className="rounded-lg border border-slate-200 p-4 text-sm font-bold text-zen-ink hover:border-zen-primary"
                    >
                      Review all classes
                      <span className="mt-1 block text-xs font-semibold text-zen-muted">Publish status and booking links</span>
                    </Link>
                    <Link
                      to="/organiser/reports"
                      className="rounded-lg border border-slate-200 p-4 text-sm font-bold text-zen-ink hover:border-zen-primary"
                    >
                      Open reports
                      <span className="mt-1 block text-xs font-semibold text-zen-muted">Bookings, hours, and resource use</span>
                    </Link>
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
