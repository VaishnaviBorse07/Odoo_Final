// Customer class grid card — duration badge, location, instructors, price, upcoming count, CTA.
import { useNavigate } from 'react-router-dom';

function initials(name) {
  return (name || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function ClassCard({ appointment }) {
  const nav = useNavigate();
  let resources = appointment.resources;
  if (!Array.isArray(resources)) {
    try {
      resources = JSON.parse(resources || '[]');
    } catch {
      resources = [];
    }
  }
  const price =
    appointment.advance_payment && Number(appointment.payment_amount) > 0
      ? `₹${Number(appointment.payment_amount).toLocaleString('en-IN')}/session`
      : null;

  return (
    <div className="group flex flex-col rounded-card border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-bold text-zen-ink">{appointment.name}</h3>
        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
          {appointment.duration_minutes} min
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-zen-muted">{appointment.description || ' '}</p>
      <p className="mt-3 text-sm text-zen-muted">{appointment.location}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {resources.map((r) => (
          <span
            key={r.id}
            className="inline-flex items-center gap-2 rounded-full bg-zen-secondary px-2 py-1 text-xs font-semibold text-zen-primary"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zen-primary text-[10px] text-white">
              {initials(r.resource_name)}
            </span>
            {r.resource_name}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <div>
          {price ? <span className="text-sm font-bold text-zen-primary">{price}</span> : <span className="text-xs font-bold text-emerald-700">Free</span>}
          <p className="text-xs text-zen-muted">{appointment.upcoming_count ?? 0} upcoming sessions</p>
        </div>
        <button
          type="button"
          onClick={() => nav(`/book/${appointment.id}`)}
          className="rounded-control bg-zen-primary px-4 py-2 text-sm font-semibold text-white hover:bg-zen-accent"
        >
          Book Now
        </button>
      </div>
    </div>
  );
}
