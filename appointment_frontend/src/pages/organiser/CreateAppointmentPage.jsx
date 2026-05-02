import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import api from '../../api/axios.js';
import { useToast } from '../../components/Toast.jsx';

export default function CreateAppointmentPage() {
  const nav = useNavigate();
  const { show } = useToast();
  const [form, setForm] = useState({
    name: '',
    description: '',
    duration_minutes: 60,
    location: '',
    slot_type: 'weekly',
    max_capacity: 10,
    manage_capacity: false,
    advance_payment: false,
    payment_amount: 0,
    confirmation_type: 'automatic',
    assignment_type: 'auto'
  });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/appointments', form);
      show('Class created as draft', 'success');
      nav(`/organiser/edit/${data.data.id}`);
    } catch (err) {
      show(err.response?.data?.message || 'Failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold">Create class</h1>
        <form onSubmit={submit} className="mt-6 space-y-4 rounded-card bg-white p-6 shadow">
          <input
            placeholder="Class name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-control border px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Description"
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-control border px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={15}
            value={form.duration_minutes}
            onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
            className="w-full rounded-control border px-3 py-2 text-sm"
          />
          <input
            placeholder="Location"
            required
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full rounded-control border px-3 py-2 text-sm"
          />
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={form.slot_type === 'weekly'}
                onChange={() => setForm({ ...form, slot_type: 'weekly' })}
              />
              Weekly
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={form.slot_type === 'flexible'}
                onChange={() => setForm({ ...form, slot_type: 'flexible' })}
              />
              Flexible
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.manage_capacity}
              onChange={(e) => setForm({ ...form, manage_capacity: e.target.checked })}
            />
            Manage capacity
          </label>
          {form.manage_capacity && (
            <input
              type="number"
              min={1}
              value={form.max_capacity}
              onChange={(e) => setForm({ ...form, max_capacity: Number(e.target.value) })}
              className="w-full rounded-control border px-3 py-2 text-sm"
            />
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.advance_payment}
              onChange={(e) => setForm({ ...form, advance_payment: e.target.checked })}
            />
            Advance payment
          </label>
          {form.advance_payment && (
            <input
              type="number"
              min={0}
              value={form.payment_amount}
              onChange={(e) => setForm({ ...form, payment_amount: Number(e.target.value) })}
              className="w-full rounded-control border px-3 py-2 text-sm"
            />
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-control bg-zen-primary py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Create Class'}
          </button>
        </form>
      </main>
    </div>
  );
}
