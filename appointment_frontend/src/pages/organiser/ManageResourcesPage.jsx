import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import api from '../../api/axios.js';
import { useToast } from '../../components/Toast.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function ManageResourcesPage() {
  const { appointmentTypeId } = useParams();
  const { show } = useToast();
  const [apt, setApt] = useState(null);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [flexForm, setFlexForm] = useState({}); // resourceId -> { slot_date, start_time, end_time }

  const load = async () => {
    const { data } = await api.get(`/appointments/${appointmentTypeId}`);
    setApt(data.data);
  };

  useEffect(() => {
    load().catch(() => setApt(null));
  }, [appointmentTypeId]);

  const addResource = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await api.post('/resources', {
        appointment_type_id: Number(appointmentTypeId),
        resource_name: name
      });
      setNewName('');
      show('Resource added', 'success');
      await load();
    } catch (err) {
      show(err.response?.data?.message || 'Failed to add', 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveName = async (r) => {
    try {
      await api.put(`/resources/${r.id}`, { resource_name: r.resource_name });
      show('Saved', 'success');
      await load();
    } catch (err) {
      show(err.response?.data?.message || 'Failed', 'error');
    }
  };

  const toggleActive = async (r) => {
    try {
      await api.put(`/resources/${r.id}`, { is_active: !r.is_active });
      show(r.is_active ? 'Deactivated' : 'Activated', 'success');
      await load();
    } catch (err) {
      show(err.response?.data?.message || 'Failed', 'error');
    }
  };

  const addFlex = async (resourceId) => {
    const f = flexForm[resourceId] || {};
    if (!f.slot_date || !f.start_time || !f.end_time) {
      show('Enter date and times', 'error');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/resources/${resourceId}/flexible-slots`, {
        slot_date: f.slot_date,
        start_time: f.start_time,
        end_time: f.end_time
      });
      show('Slot added', 'success');
      setFlexForm((prev) => ({ ...prev, [resourceId]: { slot_date: '', start_time: '', end_time: '' } }));
      await load();
    } catch (err) {
      show(err.response?.data?.message || 'Could not add slot', 'error');
    } finally {
      setBusy(false);
    }
  };

  const delFlex = async (resourceId, slotId) => {
    try {
      await api.delete(`/resources/${resourceId}/flexible-slots/${slotId}`);
      show('Slot removed', 'success');
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

  const resources = apt.resources || [];
  const isFlex = apt.slot_type === 'flexible';

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link to={`/organiser/edit/${appointmentTypeId}`} className="text-sm font-semibold text-zen-primary">
          ← Back to edit class
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-zen-ink">Resources · {apt.name}</h1>
        <p className="mt-1 text-sm text-zen-muted">
          {isFlex ? 'Flexible schedule: add dated slots per resource.' : 'Weekly schedule: set working hours per resource.'}
        </p>

        <form onSubmit={addResource} className="mt-6 flex flex-wrap gap-2 rounded-card bg-white p-4 shadow">
          <input
            placeholder="New resource name (e.g. Instructor)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="min-w-[200px] flex-1 rounded-control border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-control bg-zen-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            Add resource
          </button>
        </form>

        <ul className="mt-6 space-y-6">
          {resources.map((r) => (
            <li key={r.id} className="rounded-card border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1">
                  <label className="text-xs font-bold uppercase text-zen-muted">Name</label>
                  <input
                    className="mt-1 w-full rounded-control border px-3 py-2 text-sm"
                    value={r.resource_name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setApt({
                        ...apt,
                        resources: resources.map((x) => (x.id === r.id ? { ...x, resource_name: v } : x))
                      });
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => saveName(r)}
                  className="rounded-control border border-slate-200 px-3 py-2 text-xs font-bold"
                >
                  Save name
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(r)}
                  className="rounded-control border border-slate-200 px-3 py-2 text-xs font-bold"
                >
                  {r.is_active ? 'Deactivate' : 'Activate'}
                </button>
                {!isFlex && (
                  <Link
                    to={`/organiser/resources/${r.id}/hours`}
                    className="rounded-control bg-zen-secondary px-3 py-2 text-center text-xs font-bold text-zen-primary"
                  >
                    Working hours
                  </Link>
                )}
              </div>

              {isFlex && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-sm font-semibold text-zen-ink">Flexible slots</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm">
                    <input
                      type="date"
                      className="rounded-control border px-2 py-1"
                      value={(flexForm[r.id] || {}).slot_date || ''}
                      onChange={(e) =>
                        setFlexForm((prev) => ({
                          ...prev,
                          [r.id]: { ...(prev[r.id] || {}), slot_date: e.target.value }
                        }))
                      }
                    />
                    <input
                      type="time"
                      className="rounded-control border px-2 py-1"
                      value={(flexForm[r.id] || {}).start_time || ''}
                      onChange={(e) =>
                        setFlexForm((prev) => ({
                          ...prev,
                          [r.id]: { ...(prev[r.id] || {}), start_time: e.target.value }
                        }))
                      }
                    />
                    <input
                      type="time"
                      className="rounded-control border px-2 py-1"
                      value={(flexForm[r.id] || {}).end_time || ''}
                      onChange={(e) =>
                        setFlexForm((prev) => ({
                          ...prev,
                          [r.id]: { ...(prev[r.id] || {}), end_time: e.target.value }
                        }))
                      }
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => addFlex(r.id)}
                      className="rounded-control bg-zen-primary px-3 py-1 text-xs font-bold text-white"
                    >
                      Add slot
                    </button>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-zen-muted">
                    {(r.flexible_slots || []).map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2">
                        <span>
                          {s.slot_date} {String(s.start_time).slice(0, 5)}–{String(s.end_time).slice(0, 5)}
                        </span>
                        <button type="button" className="text-zen-error" onClick={() => delFlex(r.id, s.id)}>
                          Remove
                        </button>
                      </li>
                    ))}
                    {!(r.flexible_slots || []).length && <li>No slots yet.</li>}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
        {resources.length === 0 && <p className="mt-4 text-sm text-zen-muted">No resources yet — add one above.</p>}
      </main>
    </div>
  );
}
