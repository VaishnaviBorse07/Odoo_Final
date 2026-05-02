import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/axios.js';
import OTPInput from '../../components/OTPInput.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function OTPVerifyPage() {
  const loc = useLocation();
  const nav = useNavigate();
  const email = loc.state?.email || '';
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [devOtpHint, setDevOtpHint] = useState(loc.state?.devOtp || '');

  useEffect(() => {
    if (!email) nav('/signup', { replace: true });
  }, [email, nav]);

  useEffect(() => {
    const o = loc.state?.devOtp;
    if (o && String(o).length === 6) {
      setDigits(String(o).split(''));
    } else {
      setDigits(['', '', '', '', '', '']);
    }
  }, [loc.state?.devOtp]);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setInterval(() => setTimer((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [timer]);

  const verify = async () => {
    setError('');
    const otp_code = digits.join('');
    if (otp_code.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email, otp_code, otp_type: 'email_verify' });
      nav('/login', { state: { message: 'Email verified. Please sign in.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setTimer(30);
    try {
      const { data } = await api.post('/auth/resend-verification', { email });
      if (data.data?.otp_code) setDevOtpHint(data.data.otp_code);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-card bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zen-secondary text-zen-primary"></div>
        <h1 className="text-2xl font-bold text-zen-ink">Verify your email</h1>
        <p className="mt-2 text-sm text-zen-muted">Code sent to {email}</p>
        {devOtpHint && (
          <p className="mt-3 rounded-control bg-amber-50 px-3 py-2 text-xs text-amber-950">
            Dev only (<code className="rounded bg-white px-1">DEV_RETURN_OTP=true</code>): code{' '}
            <strong className="tracking-widest">{devOtpHint}</strong>
          </p>
        )}
        <div className="mt-6">
          <OTPInput value={digits} onChange={setDigits} />
        </div>
        {error && <p className="mt-3 text-sm text-zen-error">{error}</p>}
        <button
          type="button"
          onClick={verify}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-control bg-zen-primary py-3 text-sm font-bold text-white hover:bg-zen-accent disabled:opacity-60"
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" />
              Verifying...
            </>
          ) : (
            'Verify'
          )}
        </button>
        <div className="mt-4 text-sm text-zen-muted">
          {timer > 0 ? (
            <span>Resend in {timer}s…</span>
          ) : (
            <button type="button" onClick={resend} className="font-semibold text-zen-primary">
              Resend OTP
            </button>
          )}
        </div>
        <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-zen-primary">
          ← Back to Sign In
        </Link>
      </div>
    </div>
  );
}
