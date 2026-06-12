import { useStore } from '../store';
import Timer from '../components/Timer';

export default function Results() {
  const { room } = useStore();
  if (!room || !room.currentResults) return null;

  const record = room.album[room.album.length - 1];
  const byPlayer = new Map(record?.drawings.map((d) => [d.playerId, d]) ?? []);
  const results = [...room.currentResults].sort((a, b) => a.rank - b.rank);
  const isLastRound = room.round >= room.settings.rounds;

  return (
    <div className="results-screen">
      <div className="game-topbar" style={{ width: 'min(1200px, 96vw)' }}>
        <span className="round-pill">Round {room.round}/{room.settings.rounds}</span>
        <div className="prompt-banner">🎯 {room.prompt}</div>
        <Timer endsAt={room.phaseEndsAt} />
      </div>

      {room.judgeIntro && <div className="judge-intro">🤖 “{room.judgeIntro}”</div>}

      <div className="results-gallery">
        {results.map((r, i) => {
          const d = byPlayer.get(r.playerId);
          if (!d) return null;
          return (
            <div
              className={`card result-card ${r.rank === 1 ? 'winner' : ''}`}
              key={r.playerId}
              style={{ animationDelay: `${i * 0.18}s` }}
            >
              {r.rank === 1 && <div className="crown-float">👑</div>}
              <img src={d.image} alt={`Drawing by ${d.name}`} />
              <div className="result-meta">
                <div className="head">
                  <div className="mini-face" style={{ background: d.color }}>{d.emoji}</div>
                  <span className="rname">{d.name}</span>
                  <span className="score-badge">{r.score}</span>
                </div>
                <p className="ai-comment">“{r.comment}”</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="next-up">
        {isLastRound ? '📖 Opening the album…' : `✏️ Round ${room.round + 1} starting soon…`}
      </p>
    </div>
  );
}
