import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/axios.js';
import { useAuth } from '../../hooks/useAuth.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.data.user, data.data.token);
      const role = data.data.user.role;
      if (role === 'customer') nav('/', { replace: true });
      else if (role === 'organiser') nav('/organiser', { replace: true });
      else nav('/admin', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to sign in';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-card bg-white p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zen-primary text-xl font-extrabold text-white">
            Z
          </span>
          <span className="text-xl font-extrabold text-zen-ink">ZenFlow</span>
        </div>
        <h1 className="text-2xl font-bold text-zen-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-zen-muted">Sign in to book your next session</p>
        {loc.state?.message && <p className="mt-3 text-sm text-emerald-700">{loc.state.message}</p>}
        {error && <p className="mt-4 rounded-control bg-red-50 px-3 py-2 text-sm text-zen-error">{error}</p>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-zen-ink" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-control border border-slate-200 px-3 py-2 text-sm outline-none ring-zen-primary focus:border-zen-primary focus:ring-2"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-zen-ink" htmlFor="password">
              Password
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-control border border-slate-200 px-3 py-2 pr-10 text-sm outline-none ring-zen-primary focus:border-zen-primary focus:ring-2"
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zen-muted"
                onClick={() => setShow((s) => !s)}
              >
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-control bg-zen-primary py-3 text-sm font-bold text-white hover:bg-zen-accent disabled:opacity-60"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        <div className="mt-4 text-right text-sm">
          <Link to="/forgot-password" className="font-semibold text-zen-primary hover:underline">
            Forgot Password?
          </Link>
        </div>
        <p className="mt-6 text-center text-sm text-zen-muted">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-semibold text-zen-primary">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
