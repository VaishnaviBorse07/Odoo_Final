// Six-box OTP input — auto-advance, backspace navigation, paste support, teal focus ring.
import { useRef } from 'react';

export default function OTPInput({ value, onChange }) {
  const refs = useRef([]);

  const setDigit = (i, ch) => {
    const next = [...value];
    next[i] = ch;
    onChange(next);
  };

  const handleChange = (i, e) => {
    const v = e.target.value.replace(/\D/g, '').slice(-1);
    setDigit(i, v);
    if (v && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = [...value];
    for (let j = 0; j < 6; j += 1) next[j] = text[j] || '';
    onChange(next);
    refs.current[Math.min(text.length, 5)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="h-12 w-12 rounded-control border border-slate-200 text-center text-lg font-bold text-zen-ink outline-none ring-zen-primary focus:border-zen-primary focus:ring-2"
        />
      ))}
    </div>
  );
}
