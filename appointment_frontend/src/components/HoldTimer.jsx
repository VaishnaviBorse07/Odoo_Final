// HoldTimer — Animated countdown for BookMyShow-style slot reservation.
// Shows a pulsing amber pill with MM:SS countdown. Calls onExpired() when
// timer hits 0, and optionally calls onRelease() (DELETE /bookings/hold/{id})
// when the component unmounts (user navigates away).
import { useEffect, useRef, useState } from 'react';
import api from '../api/axios.js';

export default function HoldTimer({ expiresAt, holdId, onExpired }) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000))
  );
  const expiredFired = useRef(false);
  const holdIdRef = useRef(holdId);
  holdIdRef.current = holdId;

  // Count down every second
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        const next = Math.max(0, s - 1);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  // Fire onExpired callback exactly once when timer reaches 0
  useEffect(() => {
    if (secondsLeft === 0 && !expiredFired.current) {
      expiredFired.current = true;
      onExpired?.();
    }
  }, [secondsLeft, onExpired]);



  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const urgent = secondsLeft <= 60; // last minute: turn red

  if (secondsLeft === 0) {
    return (
      <div className="hold-timer hold-timer--expired">
        <span className="hold-timer__icon">⏰</span>
        <span className="hold-timer__text">Reservation expired</span>
      </div>
    );
  }

  return (
    <div className={`hold-timer ${urgent ? 'hold-timer--urgent' : ''}`}>
      <span className="hold-timer__icon">⏱</span>
      <span className="hold-timer__label">Slot reserved — complete payment in</span>
      <span className="hold-timer__countdown" aria-live="polite" aria-label={`${mins} minutes ${secs} seconds remaining`}>
        <span className="hold-timer__digit">{String(mins).padStart(2, '0')}</span>
        <span className="hold-timer__sep">:</span>
        <span className="hold-timer__digit">{String(secs).padStart(2, '0')}</span>
      </span>
    </div>
  );
}
