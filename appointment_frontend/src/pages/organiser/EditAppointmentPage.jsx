import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import api from '../../api/axios.js';
import { useToast } from '../../components/Toast.jsx';
import { Link } from 'react-router-dom';

export default function EditAppointmentPage() {
  const { id } = useParams();
  const { show } = useToast();
  const [apt, setApt] = useState(null);

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
      advance_payment: apt.advance_payment,
      payment_amount: apt.payment_amount,
      confirmation_type: apt.confirmation_type,
      assignment_type: apt.assignment_type
    });
    show('Saved', 'success');
  };

  if (!apt) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold">Edit class</h1>
        <div className="mt-4 space-y-3 rounded-card bg-white p-6 shadow">
          <input
            className="w-full rounded-control border px-3 py-2 text-sm"
            value={apt.name}
            onChange={(e) => setApt({ ...apt, name: e.target.value })}
          />
          <textarea
            className="w-full rounded-control border px-3 py-2 text-sm"
            rows={4}
            value={apt.description || ''}
            onChange={(e) => setApt({ ...apt, description: e.target.value })}
          />
          <div className="text-sm text-zen-muted">Resources</div>
          <ul className="list-disc pl-5 text-sm">
            {(apt.resources || []).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                {r.resource_name}
                {apt.slot_type === 'weekly' && (
                  <Link className="text-zen-primary" to={`/organiser/resources/${r.id}/hours`}>
                    Set Working Hours
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <button type="button" onClick={save} className="rounded-control bg-zen-primary px-4 py-2 text-sm font-bold text-white">
            Save Changes
          </button>
        </div>
      </main>
    </div>
  );
}
