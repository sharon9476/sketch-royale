import { useStore } from './store';
import Home from './screens/Home';
import Lobby from './screens/Lobby';
import PromptReveal from './screens/PromptReveal';
import DrawingPhase from './screens/DrawingPhase';
import Judging from './screens/Judging';
import Results from './screens/Results';
import Album from './screens/Album';

const DOODLES = ['✏️', '🎨', '⭐', '🖌️', '💡', '🌀', '✨', '🖍️', '🎭', '🌈', '⚡', '🎪'];

export default function App() {
  const { room, toast, resetRoom } = useStore();

  let screen;
  if (!room) screen = <Home />;
  else if (room.phase === 'lobby') screen = <Lobby />;
  else if (room.phase === 'prompt') screen = <PromptReveal />;
  else if (room.phase === 'drawing') screen = <DrawingPhase />;
  else if (room.phase === 'judging') screen = <Judging />;
  else if (room.phase === 'results') screen = <Results />;
  else screen = <Album />;

  return (
    <div className="app-shell">
      <div className="doodles" aria-hidden>
        {DOODLES.map((d, i) => (
          <span
            key={i}
            className="doodle"
            style={{
              left: `${(i * 83) % 100}%`,
              top: `${(i * 37 + 11) % 100}%`,
              animationDelay: `${i * 0.7}s`,
              fontSize: `${1.6 + (i % 3)}rem`,
            }}
          >
            {d}
          </span>
        ))}
      </div>
      {room && (
        <button className="btn btn-ghost btn-sm leave-btn" onClick={resetRoom}>
          ← Leave
        </button>
      )}
      {screen}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
