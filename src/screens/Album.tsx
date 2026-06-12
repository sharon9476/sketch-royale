import { useState } from 'react';
import { socket } from '../socket';
import { useStore } from '../store';

export default function Album() {
  const { room, myId, setToast } = useStore();
  const [copied, setCopied] = useState(false);
  if (!room) return null;

  const me = room.players.find((p) => p.id === myId);
  const standings = [...room.players].sort((a, b) => b.score - a.score);
  const top3 = standings.slice(0, 3);
  // visual podium order: 2nd, 1st, 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumClass = (p: (typeof top3)[number]) =>
    p.id === top3[0]?.id ? 'p1' : p.id === top3[1]?.id ? 'p2' : 'p3';
  const podiumNum = (p: (typeof top3)[number]) =>
    p.id === top3[0]?.id ? '1' : p.id === top3[1]?.id ? '2' : '3';

  const shareText = () => {
    const lines = [
      `🎨 Sketch Royale — game in room ${room.code}`,
      `🏆 Winner: ${standings[0]?.name} (${standings[0]?.score} pts)`,
      '',
      ...room.album.flatMap((r) => [
        `Round ${r.round}: “${r.prompt}”`,
        ...[...r.results]
          .sort((a, b) => a.rank - b.rank)
          .map((res) => {
            const d = r.drawings.find((x) => x.playerId === res.playerId);
            return `  ${res.rank === 1 ? '👑' : ' ' + res.rank + '.'} ${d?.name ?? '?'} — ${res.score}/100 · "${res.comment}"`;
          }),
        '',
      ]),
    ];
    return lines.join('\n');
  };

  const copyAlbum = async () => {
    try {
      await navigator.clipboard.writeText(shareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast('Could not copy — your browser blocked it.');
    }
  };

  const download = (image: string, name: string, round: number) => {
    const a = document.createElement('a');
    a.href = image;
    a.download = `sketch-royale-r${round}-${name}.png`;
    a.click();
  };

  return (
    <div className="album-screen">
      <h1 className="album-title display">📖 The Album</h1>

      <div className="podium">
        {podiumOrder.map((p, i) => (
          <div className={`podium-spot ${podiumClass(p)}`} key={p.id} style={{ animationDelay: `${i * 0.2}s` }}>
            <div className="podium-face" style={{ background: p.color }}>{p.emoji}</div>
            <span className="podium-name">{podiumNum(p) === '1' ? '👑 ' : ''}{p.name}</span>
            <span className="podium-pts">{p.score} pts</span>
            <div className="podium-block">{podiumNum(p)}</div>
          </div>
        ))}
      </div>

      <div className="album-actions">
        <button className="btn btn-yellow" onClick={copyAlbum}>
          {copied ? '✅ Copied!' : '🔗 Copy shareable recap'}
        </button>
        {me?.isHost && (
          <button className="btn btn-coral" onClick={() => socket.emit('play_again')}>
            🔁 Play again
          </button>
        )}
      </div>

      {room.album.map((r) => {
        const sorted = [...r.results].sort((a, b) => a.rank - b.rank);
        return (
          <div className="album-round" key={r.round}>
            <div className="album-round-head">
              <span className="album-round-num">ROUND {r.round}</span>
              <span className="album-prompt">“{r.prompt}”</span>
            </div>
            <p className="album-judge-intro">🤖 {r.judgeIntro}</p>
            <div className="album-gallery">
              {sorted.map((res) => {
                const d = r.drawings.find((x) => x.playerId === res.playerId);
                if (!d) return null;
                return (
                  <div className={`card result-card album-card ${res.rank === 1 ? 'winner' : ''}`} key={res.playerId}>
                    {res.rank === 1 && <div className="crown-float">👑</div>}
                    <img
                      src={d.image}
                      alt={`Drawing by ${d.name}`}
                      style={{ cursor: 'pointer' }}
                      title="Click to download"
                      onClick={() => download(d.image, d.name, r.round)}
                    />
                    <div className="result-meta">
                      <div className="head">
                        <div className="mini-face" style={{ background: d.color }}>{d.emoji}</div>
                        <span className="rname">{d.name}</span>
                        <span className="score-badge">{res.score}</span>
                      </div>
                      <p className="ai-comment">“{res.comment}”</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
