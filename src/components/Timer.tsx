import { useEffect, useState } from 'react';

export default function Timer({ endsAt, onZero }: { endsAt: number | null; onZero?: () => void }) {
  const [left, setLeft] = useState(() => (endsAt ? Math.max(0, endsAt - Date.now()) : 0));

  useEffect(() => {
    if (!endsAt) return;
    let fired = false;
    const tick = () => {
      const ms = Math.max(0, endsAt - Date.now());
      setLeft(ms);
      if (ms <= 0 && !fired) {
        fired = true;
        onZero?.();
      }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt]);

  if (!endsAt) return null;
  const secs = Math.ceil(left / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return (
    <div className="timer-wrap">
      <span style={{ fontSize: '1.4rem' }}>⏰</span>
      <span className={`timer-clock ${secs <= 10 ? 'urgent' : ''}`}>
        {m > 0 ? `${m}:${String(s).padStart(2, '0')}` : secs}
      </span>
    </div>
  );
}
