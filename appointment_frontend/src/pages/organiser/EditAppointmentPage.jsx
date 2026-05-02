import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import api from '../../api/axios.js';
import { useToast } from '../../components/Toast.jsx';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function EditAppointmentPage() {
  const { id } = useParams();
  const { show } = useToast();
  const [apt, setApt] = useState(null);
  const [qText, setQText] = useState('');
  const [qRequired, setQRequired] = useState(true);

  const load = async () => {
    const { data } = await api.get(`/appointments/${id}`);
    setApt(data.data);
  };

  useEffect(() => {
    load();
  }, [id]);

  const save = async () => {
    await api.put(`/appointments/${id}`, {
      name: apt.name,
      description: apt.description,
      duration_minutes: apt.duration_minutes,
      location: apt.location,
      slot_type: apt.slot_type,
      max_capacity: apt.max_capacity,
      manage_capacity: apt.manage_capacity,
      payment_amount: apt.payment_amount,
      confirmation_type: apt.confirmation_type,
      assignment_type: apt.assignment_type
    });
    show('Saved', 'success');
  };

  const addQuestion = async (e) => {
    e.preventDefault();
    const t = qText.trim();
    if (!t) return;
    try {
      await api.post(`/appointments/${id}/questions`, {
        question_text: t,
        is_required: qRequired,
        display_order: (apt.questions || []).length
      });
      setQText('');
      show('Question added', 'success');
      await load();
    } catch (err) {
      show(err.response?.data?.message || 'Failed', 'error');
    }
  };

  const delQuestion = async (qid) => {
    try {
      await api.delete(`/appointments/${id}/questions/${qid}`);
      show('Removed', 'success');
      await load();
    } catch (err) {
      show(err.response?.data?.message || 'Failed', 'error');
    }
  };

  if (!apt) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold">Edit class</h1>
        <div className="mt-4 space-y-4 rounded-card bg-white p-6 shadow">
          <div>
            <label className="text-xs font-bold uppercase text-zen-muted">Name</label>
            <input
              className="mt-1 w-full rounded-control border px-3 py-2 text-sm"
              value={apt.name}
              onChange={(e) => setApt({ ...apt, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-zen-muted">Description</label>
            <textarea
              className="mt-1 w-full rounded-control border px-3 py-2 text-sm"
              rows={4}
              value={apt.description || ''}
              onChange={(e) => setApt({ ...apt, description: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold uppercase text-zen-muted">Duration (minutes)</label>
              <input
                type="number"
                min={15}
                className="mt-1 w-full rounded-control border px-3 py-2 text-sm"
                value={apt.duration_minutes}
                onChange={(e) => setApt({ ...apt, duration_minutes: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-zen-muted">Location</label>
              <input
                className="mt-1 w-full rounded-control border px-3 py-2 text-sm"
                value={apt.location || ''}
                onChange={(e) => setApt({ ...apt, location: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-zen-muted">Slot schedule</label>
            <div className="mt-2 flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={apt.slot_type === 'weekly'}
                  onChange={() => setApt({ ...apt, slot_type: 'weekly' })}
                />
                Weekly
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={apt.slot_type === 'flexible'}
                  onChange={() => setApt({ ...apt, slot_type: 'flexible' })}
                />
                Flexible
              </label>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={apt.manage_capacity}
              onChange={(e) => setApt({ ...apt, manage_capacity: e.target.checked })}
            />
            Manage capacity (max per slot)
          </label>
          {apt.manage_capacity && (
            <input
              type="number"
              min={1}
              className="w-full rounded-control border px-3 py-2 text-sm"
              value={apt.max_capacity}
              onChange={(e) => setApt({ ...apt, max_capacity: Number(e.target.value) })}
            />
          )}
          <div>
            <label className="text-xs font-bold uppercase text-zen-muted">Booking fee (₹)</label>
            <input
              type="number"
              min={1}
              step={1}
              value={apt.payment_amount ?? 1}
              onChange={(e) => setApt({ ...apt, payment_amount: Number(e.target.value) })}
              className="mt-1 w-full rounded-control border px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-zen-muted">Minimum ₹1 before publishing.</p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-zen-muted">Confirmation</label>
            <select
              className="mt-1 w-full rounded-control border px-3 py-2 text-sm"
              value={apt.confirmation_type}
              onChange={(e) => setApt({ ...apt, confirmation_type: e.target.value })}
            >
              <option value="automatic">Automatic (after payment when applicable)</option>
              <option value="manual">Manual (you confirm pending bookings)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-zen-muted">Resource assignment</label>
            <select
              className="mt-1 w-full rounded-control border px-3 py-2 text-sm"
              value={apt.assignment_type}
              onChange={(e) => setApt({ ...apt, assignment_type: e.target.value })}
            >
              <option value="auto">Auto</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <button type="button" onClick={save} className="rounded-control bg-zen-primary px-4 py-2 text-sm font-bold text-white">
            Save changes
          </button>
        </div>

        <div className="mt-6 rounded-card bg-white p-6 shadow">
          <h2 className="text-lg font-bold text-zen-ink">Resources & schedules</h2>
          <p className="mt-1 text-sm text-zen-muted">Add instructors, working hours (weekly) or dated slots (flexible).</p>
          <Link
            to={`/organiser/appointments/${id}/resources`}
            className="mt-3 inline-block rounded-control bg-zen-secondary px-4 py-2 text-sm font-bold text-zen-primary"
          >
            Manage resources & slots
          </Link>
          <ul className="mt-4 list-disc pl-5 text-sm text-zen-muted">
            {(apt.resources || []).map((r) => (
              <li key={r.id}>
                {r.resource_name}
                {apt.slot_type === 'weekly' && (
                  <>
                    {' '}
                    <Link className="text-zen-primary" to={`/organiser/resources/${r.id}/hours`}>
                      Working hours
                    </Link>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 rounded-card bg-white p-6 shadow">
          <h2 className="text-lg font-bold text-zen-ink">Booking questions</h2>
          <ul className="mt-3 space-y-2">
            {(apt.questions || []).map((q) => (
              <li key={q.id} className="flex items-start justify-between gap-2 text-sm">
                <span>
                  {q.question_text}
                  {q.is_required && <span className="text-zen-error"> *</span>}
                </span>
                <button type="button" className="text-xs font-semibold text-zen-error" onClick={() => delQuestion(q.id)}>
                  Remove
                </button>
              </li>
            ))}
            {!(apt.questions || []).length && <li className="text-zen-muted">No questions yet.</li>}
          </ul>
          <form onSubmit={addQuestion} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              placeholder="New question for customers"
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              className="flex-1 rounded-control border px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-sm whitespace-nowrap">
              <input type="checkbox" checked={qRequired} onChange={(e) => setQRequired(e.target.checked)} />
              Required
            </label>
            <button type="submit" className="rounded-control bg-zen-primary px-4 py-2 text-sm font-bold text-white">
              Add
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
