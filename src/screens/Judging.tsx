import { useEffect, useState } from 'react';
import { useStore } from '../store';

const LINES = [
  'Adjusting monocle…',
  'Measuring artistic intent…',
  'Comparing against the prompt…',
  'Consulting the ghost of Bob Ross…',
  'Counting suspicious squiggles…',
  'Calculating creativity coefficients…',
  'Judging silently. Very silently…',
];

export default function Judging() {
  const { room } = useStore();
  const [line, setLine] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setLine((l) => (l + 1) % LINES.length), 1800);
    return () => clearInterval(id);
  }, []);

  if (!room) return null;

  return (
    <div className="judging-screen">
      <div className="judge-bot">🧐</div>
      <h2 className="display">The AI judge is examining the gallery…</h2>
      <p className="tagline" key={line} style={{ animation: 'chat-in 0.3s ease' }}>
        {LINES[line]}
      </p>
    </div>
  );
}
