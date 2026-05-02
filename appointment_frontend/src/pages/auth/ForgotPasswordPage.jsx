import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios.js';
import OTPInput from '../../components/OTPInput.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

const strong = (p) =>
  p.length >= 8 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /[\W_]/.test(p);

function maskEmail(em) {
  const [u, d] = em.split('@');
  if (!d) return em;
  return `${u.slice(0, 2)}***@${d}`;
}

export default function ForgotPasswordPage() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [devOtpHint, setDevOtpHint] = useState('');

  const criteria = useMemo(
    () => [
      { ok: pw.length >= 8, label: 'At least 8 characters' },
      { ok: /[A-Z]/.test(pw), label: 'One uppercase letter' },
      { ok: /[a-z]/.test(pw), label: 'One lowercase letter' },
      { ok: /[\W_]/.test(pw), label: 'One special character' }
    ],
    [pw]
  );

  const sendOtp = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      if (data.data?.otp_code) setDevOtpHint(data.data.otp_code);
      setStep(2);
    } catch {
      setErr('Could not send OTP');
    } finally {
      setLoading(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    setErr('');
    if (!strong(pw) || pw !== confirm) {
      setErr('Check password strength and confirmation');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email,
        otp_code: digits.join(''),
        new_password: pw
      });
      nav('/login', { state: { message: 'Password reset! Please log in.' } });
    } catch (er) {
      setErr(er.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-card bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-zen-ink">Forgot password</h1>
        {err && <p className="mt-3 text-sm text-zen-error">{err}</p>}
        {step === 1 && (
          <form onSubmit={sendOtp} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-semibold">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-control border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zen-primary"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-control bg-zen-primary py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Sending...
                </>
              ) : (
                'Send OTP'
              )}
            </button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={reset} className="mt-6 space-y-4 text-left">
            <p className="text-sm text-zen-muted">Sent to {maskEmail(email)}</p>
            {devOtpHint && (
              <p className="rounded-control bg-amber-50 px-3 py-2 text-xs text-amber-950">
                Local server: OTP <strong className="tracking-widest">{devOtpHint}</strong>
              </p>
            )}
            <OTPInput value={digits} onChange={setDigits} />
            <div>
              <label className="text-sm font-semibold">New password</label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="mt-1 w-full rounded-control border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zen-primary"
              />
              <ul className="mt-2 space-y-1 text-xs">
                {criteria.map((c) => (
                  <li key={c.label} className={c.ok ? 'text-emerald-700' : 'text-zen-muted'}>
                    {c.ok ? '✓' : '✗'} {c.label}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <label className="text-sm font-semibold">Confirm new password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-control border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zen-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-control bg-zen-primary py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        )}
        <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-zen-primary">
          ← Back to Sign In
        </Link>
      </div>
    </div>
  );
}
