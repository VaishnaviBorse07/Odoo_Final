// Maps booking / publish statuses to color chips for lists and cards.
const map = {
  confirmed: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-900',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-slate-200 text-slate-700',
  rescheduled: 'bg-sky-100 text-sky-800',
  published: 'bg-emerald-100 text-emerald-800',
  unpublished: 'bg-slate-200 text-slate-700',
  draft: 'bg-amber-100 text-amber-900',
  active: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-red-100 text-red-800',
  pending_verification: 'bg-amber-100 text-amber-900'
};

export default function StatusBadge({ status }) {
  const cls = map[String(status)] || 'bg-slate-100 text-slate-700';
  const label = String(status || '').replace(/_/g, ' ');
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {label}
    </span>
  );
}
