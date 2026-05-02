import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import api from '../../api/axios.js';
import { useAuth } from '../../hooks/useAuth.js';

// ── Category chips ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: 'All',        icon: '' },
  { label: 'Yoga',       icon: '' },
  { label: 'Meditation', icon: '' },
  { label: 'Workshop',   icon: '' },
  { label: 'Private',    icon: '' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function initials(name) {
  return (name || '?').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

// ── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm animate-pulse">
      <div className="h-5 w-2/3 rounded-lg bg-slate-200 mb-3" />
      <div className="h-3 w-full rounded bg-slate-100 mb-2" />
      <div className="h-3 w-4/5 rounded bg-slate-100 mb-4" />
      <div className="h-3 w-1/3 rounded bg-slate-100 mb-4" />
      <div className="flex justify-between items-center mt-6">
        <div className="h-4 w-1/4 rounded bg-slate-200" />
        <div className="h-9 w-24 rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}

// ── Class Card ───────────────────────────────────────────────────────────────
function ClassCard({ appointment }) {
  const nav = useNavigate();
  let resources = appointment.resources;
  if (!Array.isArray(resources)) {
    try { resources = JSON.parse(resources || '[]'); } catch { resources = []; }
  }

  const price =
    appointment.advance_payment && Number(appointment.payment_amount) > 0
      ? `₹${Number(appointment.payment_amount).toLocaleString('en-IN')}`
      : null;

  const typeColors = {
    weekly:   'bg-blue-50 text-blue-700',
    flexible: 'bg-violet-50 text-violet-700',
  };

  return (
    <div className="group flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      {/* Colored top strip */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#0F6E56] to-[#1D9E75]" />

      <div className="flex flex-col flex-1 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-gray-900 leading-snug">{appointment.name}</h3>
          <span className="shrink-0 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            {appointment.duration_minutes} min
          </span>
        </div>

        {/* Description */}
        <p className="mt-2 text-sm text-gray-500 line-clamp-2 leading-relaxed">
          {appointment.description || 'Join this session to explore your potential.'}
        </p>

        {/* Location */}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
          <span></span>
          <span>{appointment.location || 'Online'}</span>
        </div>

        {/* Slot type badge */}
        <div className="mt-2">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeColors[appointment.slot_type] || 'bg-gray-100 text-gray-600'}`}>
            {appointment.slot_type === 'weekly' ? '🗓 Weekly' : 'Flexible'}
          </span>
        </div>

        {/* Instructors */}
        {resources.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {resources.map((r) => (
              <span
                key={r.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#E1F5EE] px-2.5 py-1 text-xs font-semibold text-[#0F6E56]"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0F6E56] text-[9px] text-white font-bold">
                  {initials(r.resource_name)}
                </span>
                {r.resource_name}
              </span>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between gap-2 pt-4 border-t border-slate-100">
          <div>
            {price ? (
              <p className="text-base font-extrabold text-[#0F6E56]">{price}<span className="text-xs font-normal text-gray-400">/session</span></p>
            ) : (
              <span className="text-sm font-bold text-emerald-600">Free</span>
            )}
            <p className="text-[11px] text-gray-400 mt-0.5">
              {appointment.upcoming_count ?? appointment.total_upcoming_bookings ?? 0} upcoming
            </p>
          </div>
          <button
            type="button"
            onClick={() => nav(`/book/${appointment.id}`)}
            className="rounded-xl bg-[#0F6E56] px-5 py-2 text-sm font-bold text-white hover:bg-[#1D9E75] active:scale-95 transition-all duration-150 shadow-sm"
          >
            Book Now →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stat Pill ────────────────────────────────────────────────────────────────
function StatPill({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/10 backdrop-blur-sm px-5 py-3 border border-white/20">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-white font-extrabold text-lg leading-none">{value}</p>
        <p className="text-white/70 text-xs mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user } = useAuth();
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);
  const [q, setQ]           = useState('');
  const [chip, setChip]     = useState('All');

  // Fetch appointments from backend
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const { data } = await api.get('/appointments', {
          params: { search: q || undefined },
        });
        if (!cancelled) setItems(data.data?.appointments || []);
      } catch {
        if (!cancelled) { setItems([]); setError(true); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [q]);

  // Client-side category filter
  const filtered = useMemo(() => {
    if (chip === 'All') return items;
    const k = chip.toLowerCase();
    return items.filter(
      (a) =>
        (a.name || '').toLowerCase().includes(k) ||
        (a.description || '').toLowerCase().includes(k)
    );
  }, [items, chip]);

  const firstName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-[#0a4d3c] via-[#0F6E56] to-[#1D9E75] px-4 py-14 overflow-hidden">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-white/5" />

        <div className="mx-auto max-w-6xl">
          {/* Greeting */}
          <p className="text-white/70 text-sm font-semibold tracking-widest uppercase mb-2">
            {greeting()} 
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight max-w-xl">
            Welcome back, <span className="text-[#a7f3d0]">{firstName}</span>.<br />
            Ready for your practice?
          </h1>
          <p className="mt-3 text-white/70 text-sm max-w-md">
            Discover yoga classes, workshops & private sessions — book in seconds.
          </p>

          {/* Search bar */}
          <div className="mt-7 flex items-center max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden">
            <span className="pl-4 text-gray-400 text-lg"></span>
            <input
              id="class-search"
              type="text"
              placeholder="Search classes, workshops…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="flex-1 px-3 py-3.5 text-sm text-gray-800 placeholder-gray-400 bg-transparent outline-none"
            />
            {q && (
              <button
                onClick={() => setQ('')}
                className="pr-4 text-gray-400 hover:text-gray-600 text-sm font-bold"
              >✕</button>
            )}
          </div>

          {/* Stats row */}
          <div className="mt-8 flex flex-wrap gap-3">
            <StatPill icon="" label="Classes available" value={items.length || '—'} />
            <StatPill icon="" label="Avg. duration" value="55 min" />
            <StatPill icon="" label="Easy payments" value="Razorpay" />
          </div>
        </div>
      </section>

      {/* ── Category chips ────────────────────────────────────────────────── */}
      <section className="sticky top-0 z-10 bg-white border-b border-slate-100 shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => setChip(c.label)}
              className={`whitespace-nowrap flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                chip === c.label
                  ? 'bg-[#0F6E56] text-white shadow-md scale-105'
                  : 'bg-slate-100 text-gray-600 hover:bg-[#E1F5EE] hover:text-[#0F6E56]'
              }`}
            >
              <span>{c.icon}</span> {c.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Class Grid ────────────────────────────────────────────────────── */}
      <main id="browse-classes" className="mx-auto max-w-6xl px-4 py-10">

        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">
              {chip === 'All' ? 'All Classes' : `${chip} Classes`}
            </h2>
            {!loading && (
              <p className="text-sm text-gray-400 mt-0.5">
                {filtered.length} {filtered.length === 1 ? 'class' : 'classes'} found
              </p>
            )}
          </div>
          {q && (
            <button
              onClick={() => setQ('')}
              className="text-xs text-[#0F6E56] font-semibold hover:underline"
            >
              Clear search
            </button>
          )}
        </div>

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-4"></span>
            <p className="text-gray-700 font-bold text-lg">Could not connect to server</p>
            <p className="text-gray-400 text-sm mt-1">Make sure the backend is running on port 8000.</p>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && !error && (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-6xl mb-4"></span>
            <p className="text-gray-700 font-bold text-lg">No classes found</p>
            <p className="text-gray-400 text-sm mt-1">Try a different search term or category.</p>
            <button
              onClick={() => { setQ(''); setChip('All'); }}
              className="mt-5 rounded-xl bg-[#0F6E56] px-6 py-2 text-sm font-bold text-white hover:bg-[#1D9E75] transition"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Class cards */}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((a) => <ClassCard key={a.id} appointment={a} />)}
          </div>
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="mt-10 border-t border-slate-100 bg-white py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} ZenFlow — Appointment Booking Platform
      </footer>
    </div>
  );
}
