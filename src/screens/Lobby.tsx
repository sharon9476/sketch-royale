import { useState } from 'react';
import { socket } from '../socket';
import { useStore } from '../store';

export default function Lobby() {
  const { room, myId, setToast } = useStore();
  const [copied, setCopied] = useState(false);
  if (!room) return null;

  const me = room.players.find((p) => p.id === myId);
  const isHost = !!me?.isHost;
  const s = room.settings;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setToast(`Room code: ${room.code}`);
    }
  };

  const set = (patch: Partial<typeof s>) => socket.emit('update_settings', patch);

  const emptySlots = Math.max(0, Math.min(10, 6) - room.players.length);

  return (
    <div className="lobby">
      <div className="room-code-pill" onClick={copyCode} title="Click to copy">
        <span style={{ fontWeight: 800, fontSize: '0.9rem', opacity: 0.8 }}>ROOM</span>
        <span className="code">{room.code}</span>
        <span style={{ fontSize: '1.1rem' }}>{copied ? '✅' : '📋'}</span>
      </div>

      <div className="lobby-grid">
        <div className="card">
          <h2 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            👥 Players <span style={{ color: 'var(--ink-soft)', fontSize: '1rem' }}>{room.players.length}/10</span>
          </h2>
          <div className="player-grid">
            {room.players.map((p) => (
              <div className="player-chip" key={p.id}>
                {p.isHost && <span className="host-badge">👑</span>}
                <div className="face" style={{ background: p.color }}>{p.emoji}</div>
                <span className="pname">{p.name}{p.id === myId ? ' (you)' : ''}</span>
              </div>
            ))}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div className="empty-slot" key={i}>waiting…</div>
            ))}
          </div>
        </div>

        <div className="card settings-panel">
          <h2>⚙️ Game settings</h2>

          <div className="setting">
            <label>Rounds</label>
            <div className="stepper">
              <button disabled={!isHost || s.rounds <= 1} onClick={() => set({ rounds: s.rounds - 1 })}>−</button>
              <span className="val">{s.rounds}</span>
              <button disabled={!isHost || s.rounds >= 10} onClick={() => set({ rounds: s.rounds + 1 })}>+</button>
            </div>
          </div>

          <div className="setting">
            <label>Drawing time</label>
            <div className="stepper">
              <button disabled={!isHost || s.drawSeconds <= 20} onClick={() => set({ drawSeconds: s.drawSeconds - 10 })}>−</button>
              <span className="val">{s.drawSeconds}s</span>
              <button disabled={!isHost || s.drawSeconds >= 300} onClick={() => set({ drawSeconds: s.drawSeconds + 10 })}>+</button>
            </div>
          </div>

          <div className="setting">
            <label>Prompt theme (optional)</label>
            <input
              className="input"
              placeholder='e.g. "animals", "space", "office life"'
              value={s.theme}
              disabled={!isHost}
              maxLength={60}
              onChange={(e) => set({ theme: e.target.value })}
            />
          </div>

          <div className={`ai-pill ${room.aiLive ? 'live' : 'mock'}`}>
            {room.aiLive ? '🤖 AI judge online' : '🎭 AI in demo mode (no API key)'}
          </div>

          {isHost ? (
            <button
              className="btn btn-coral btn-big"
              onClick={() => socket.emit('start_game')}
              disabled={room.players.length < 2}
            >
              🚀 Start game!
            </button>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--ink-soft)', fontWeight: 700 }}>
              Waiting for the host to start… 🍿
            </p>
          )}
          {isHost && room.players.length < 2 && (
            <p style={{ textAlign: 'center', color: 'var(--ink-soft)', fontWeight: 700, fontSize: '0.9rem' }}>
              Invite at least one friend with the room code!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
