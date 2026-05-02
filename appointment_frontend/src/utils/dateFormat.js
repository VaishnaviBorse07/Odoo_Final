// Display helpers — long date and 12h time range per ZenFlow UI spec (Intl-based).

export function formatDateLabel(isoDate) {
  const d = typeof isoDate === 'string' ? new Date(isoDate.slice(0, 10) + 'T12:00:00') : isoDate;
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(d);
}

export function formatTimeRange(start, end) {
  const parse = (t) => {
    const s = String(t).slice(0, 5);
    const [h, m] = s.split(':').map(Number);
    const d = new Date(1970, 0, 1, h, m);
    return d;
  };
  const fmt = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${fmt.format(parse(start))} – ${fmt.format(parse(end))}`;
}
