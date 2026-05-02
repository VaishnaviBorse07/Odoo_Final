import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import api from '../../api/axios.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function ClassDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [apt, setApt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/appointments/${id}`);
        if (!cancelled) setApt(data.data);
      } catch {
        if (!cancelled) setApt(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link to="/" className="text-sm font-semibold text-zen-primary">
          ← Browse Classes
        </Link>
        {loading && (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        )}
        {!loading && apt && (
          <>
            <h1 className="mt-4 text-3xl font-extrabold text-zen-ink">{apt.name}</h1>
            <p className="mt-3 text-zen-muted">{apt.description}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-zen-secondary px-3 py-1 font-semibold text-zen-primary">
                {apt.duration_minutes} min
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">{apt.location}</span>
              {apt.advance_payment && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">
                  ₹{Number(apt.payment_amount).toLocaleString('en-IN')}
                </span>
              )}
            </div>
            <h2 className="mt-8 font-bold text-zen-ink">Instructors</h2>
            <ul className="mt-2 list-disc pl-5 text-sm text-zen-muted">
              {(apt.resources || []).map((r) => (
                <li key={r.id}>{r.resource_name}</li>
              ))}
            </ul>
            <h2 className="mt-6 font-bold text-zen-ink">You&apos;ll be asked</h2>
            <ul className="mt-2 list-disc pl-5 text-sm text-zen-muted">
              {(apt.questions || []).map((q) => (
                <li key={q.id}>{q.question_text}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => nav(`/book/${apt.id}`)}
              className="mt-8 w-full rounded-control bg-zen-primary py-3 text-center text-lg font-bold text-white hover:bg-zen-accent"
            >
              Book a Session
            </button>
            <p className="mt-10 text-sm text-zen-muted">Be the first to review this class.</p>
          </>
        )}
      </main>
    </div>
  );
}
