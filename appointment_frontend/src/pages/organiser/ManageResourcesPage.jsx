import Navbar from '../../components/Navbar.jsx';
import { Link } from 'react-router-dom';

export default function ManageResourcesPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-bold">Manage resources</h1>
        <p className="mt-2 text-sm text-zen-muted">Use Edit Class to add instructors and schedules.</p>
        <Link to="/organiser" className="mt-4 inline-block text-zen-primary">
          ← Back
        </Link>
      </main>
    </div>
  );
}
