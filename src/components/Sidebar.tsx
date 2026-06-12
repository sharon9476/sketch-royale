import { useEffect, useRef, useState } from 'react';
import { socket } from '../socket';
import { useStore } from '../store';

export default function Sidebar({ showSubmitted = false }: { showSubmitted?: boolean }) {
  const { room, chatLog, myId } = useStore();
  const [text, setText] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [chatLog]);

  if (!room) return null;
  const sorted = [...room.players].sort((a, b) => b.score - a.score);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    socket.emit('chat', text);
    setText('');
  };

  return (
    <div className="sidebar">
      <div className="card scoreboard">
        <h3>🏆 Scoreboard</h3>
        {sorted.map((p, i) => (
          <div className={`score-row ${p.id === myId ? 'me' : ''}`} key={p.id}>
            <span style={{ fontWeight: 800, color: 'var(--ink-soft)', width: 18 }}>{i + 1}</span>
            <div className="mini-face" style={{ background: p.color }}>{p.emoji}</div>
            <span className={`sname ${p.connected ? '' : 'gone'}`}>
              {p.name}
              {p.isHost ? ' 👑' : ''}
            </span>
            {showSubmitted && p.hasSubmitted && <span className="submitted-check">✅</span>}
            <span className="pts">{p.score}</span>
          </div>
        ))}
      </div>

      <div className="card chat-box">
        <div className="chat-head">💬 Chat</div>
        <div className="chat-log" ref={logRef}>
          {chatLog.length === 0 && (
            <span style={{ color: 'var(--ink-soft)', fontSize: '0.88rem', fontStyle: 'italic' }}>
              Talk trash responsibly…
            </span>
          )}
          {chatLog.map((m, i) => (
            <div className="chat-msg" key={i}>
              <span className="who" style={{ color: m.color === '#ffcc2e' ? '#b8860b' : m.color }}>
                {m.emoji} {m.name}:
              </span>{' '}
              {m.text}
            </div>
          ))}
        </div>
        <form className="chat-form" onSubmit={send}>
          <input
            className="input"
            placeholder="Say something…"
            value={text}
            maxLength={200}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn btn-sm" type="submit">➤</button>
        </form>
      </div>
    </div>
  );
}
