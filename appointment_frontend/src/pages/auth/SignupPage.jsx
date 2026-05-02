import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

const strong = (p) =>
  p.length >= 8 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /[\W_]/.test(p);

export default function SignupPage() {
  const nav = useNavigate();
  const [full_name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const criteria = useMemo(
    () => [
      { ok: password.length >= 8, label: 'At least 8 characters' },
      { ok: /[A-Z]/.test(password), label: 'One uppercase letter' },
      { ok: /[a-z]/.test(password), label: 'One lowercase letter' },
      { ok: /[\W_]/.test(password), label: 'One special character' }
    ],
    [password]
  );

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!full_name.trim()) next.full_name = 'Name is required';
    if (password !== confirm) next.confirm = 'Passwords do not match';
    if (!strong(password)) next.password = 'Password does not meet all criteria';
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', { full_name: full_name.trim(), email, password });
      const devOtp = data.data?.otp_code || '';
      nav('/verify-otp', { state: { email, ...(devOtp ? { devOtp } : {}) } });
    } catch (err) {
      setErrors({ form: err.response?.data?.message || 'Signup failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-card bg-white p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zen-primary text-xl font-extrabold text-white">
            Z
          </span>
          <span className="text-xl font-extrabold text-zen-ink">ZenFlow</span>
        </div>
        <h1 className="text-2xl font-bold text-zen-ink">Create your account</h1>
        {errors.form && <p className="mt-3 text-sm text-zen-error">{errors.form}</p>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-semibold">Full name</label>
            <input
              value={full_name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-control border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zen-primary"
            />
            {errors.full_name && <p className="mt-1 text-xs text-zen-error">{errors.full_name}</p>}
          </div>
          <div>
            <label className="text-sm font-semibold">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-control border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zen-primary"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">Password</label>
            <div className="relative mt-1">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-control border border-slate-200 px-3 py-2 pr-12 text-sm outline-none focus:ring-2 focus:ring-zen-primary"
              />
              <button type="button" className="absolute right-2 top-2 text-xs text-zen-muted" onClick={() => setShow((s) => !s)}>
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
            <ul className="mt-2 space-y-1 text-xs">
              {criteria.map((c) => (
                <li key={c.label} className={c.ok ? 'text-emerald-700' : 'text-zen-muted'}>
                  {c.ok ? '✓' : '✗'} {c.label}
                </li>
              ))}
            </ul>
            {errors.password && <p className="mt-1 text-xs text-zen-error">{errors.password}</p>}
          </div>
          <div>
            <label className="text-sm font-semibold">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-control border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zen-primary"
            />
            {errors.confirm && <p className="mt-1 text-xs text-zen-error">{errors.confirm}</p>}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-control bg-zen-primary py-3 text-sm font-bold text-white hover:bg-zen-accent disabled:opacity-60"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                Creating...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-zen-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-zen-primary">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
