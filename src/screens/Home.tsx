import { useState } from 'react';
import { socket } from '../socket';
import { useStore } from '../store';

const EMOJIS = ['🐸', '🦊', '🐼', '🦄', '🐙', '🦖', '🐱', '🐢', '🦉', '🐝', '🦁', '👾', '🤖', '👻', '🍕', '🌵'];
const COLORS = ['#ffcc2e', '#ff5e7a', '#2ee6a8', '#4cc9f0', '#9b6bff', '#ff9f43', '#f368e0', '#7bed9f'];

function Logo() {
  const text = 'Sketch Royale';
  return (
    <h1 className="logo" aria-label={text}>
      {text.split('').map((c, i) =>
        c === ' ' ? (
          <span key={i}>&nbsp;</span>
        ) : (
          <span key={i} className="l" style={{ animationDelay: `${i * 0.08}s` }}>
            {c}
          </span>
        )
      )}
    </h1>
  );
}

export default function Home() {
  const { setToast } = useStore();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(() => EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
  const [color, setColor] = useState(() => COLORS[Math.floor(Math.random() * COLORS.length)]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const me = { name: name.trim(), emoji, color };

  const handle = (res: { ok: true; code: string } | { ok: false; error: string }) => {
    setBusy(false);
    if (!res.ok) setToast(res.error);
  };

  const createRoom = () => {
    if (!me.name) return setToast('Pick a name first!');
    setBusy(true);
    socket.emit('create_room', me, handle);
  };

  const joinRoom = () => {
    if (!me.name) return setToast('Pick a name first!');
    if (code.trim().length < 4) return setToast('Enter the 4-letter room code!');
    setBusy(true);
    socket.emit('join_room', { ...me, code: code.trim() }, handle);
  };

  const nextEmoji = () => setEmoji(EMOJIS[(EMOJIS.indexOf(emoji) + 1) % EMOJIS.length]);

  return (
    <div className="home">
      <div style={{ textAlign: 'center' }}>
        <Logo />
        <p className="tagline">Everyone draws the same AI prompt. The AI picks a winner. Chaos ensues. 🤖⚖️</p>
      </div>

      <div className="card home-card">
        <div className="avatar-picker">
          <div
            className="avatar-preview"
            style={{ background: color }}
            onClick={nextEmoji}
            title="Click to change your face!"
          >
            {emoji}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              className="input"
              placeholder="Your nickname"
              maxLength={16}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createRoom()}
            />
            <div className="swatch-row">
              {COLORS.map((c) => (
                <div
                  key={c}
                  className={`swatch ${c === color ? 'sel' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>

        <button className="btn btn-yellow btn-big" onClick={createRoom} disabled={busy}>
          🎉 Create a room
        </button>

        <div className="divider">OR JOIN A FRIEND</div>

        <div className="join-row">
          <input
            className="input"
            placeholder="CODE"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
          />
          <button className="btn btn-mint" onClick={joinRoom} disabled={busy} style={{ flexShrink: 0 }}>
            Join →
          </button>
        </div>
      </div>
    </div>
  );
}
