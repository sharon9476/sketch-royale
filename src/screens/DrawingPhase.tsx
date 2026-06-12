import { useCallback, useRef, useState } from 'react';
import { socket } from '../socket';
import { useStore } from '../store';
import DrawCanvas, { type DrawCanvasHandle, type Tool } from '../components/DrawCanvas';
import Sidebar from '../components/Sidebar';
import Timer from '../components/Timer';

const PALETTE = [
  '#000000', '#666666', '#aaaaaa', '#ffffff', '#7a4a1f', '#c0392b',
  '#ff5e7a', '#ff9f43', '#ffcc2e', '#fff7ae', '#2ee6a8', '#1e8e5a',
  '#4cc9f0', '#2155cd', '#9b6bff', '#f368e0', '#ffd9c0', '#84592b',
];
const SIZES = [3, 7, 14, 26];

const TOOLS: { id: Tool; icon: string; label: string }[] = [
  { id: 'pen', icon: '✏️', label: 'Pen' },
  { id: 'eraser', icon: '🧼', label: 'Eraser' },
  { id: 'bucket', icon: '🪣', label: 'Fill' },
  { id: 'line', icon: '📏', label: 'Line' },
  { id: 'rect', icon: '⬜', label: 'Rectangle' },
  { id: 'ellipse', icon: '⭕', label: 'Circle' },
];

export default function DrawingPhase() {
  const { room } = useStore();
  const canvas = useRef<DrawCanvasHandle>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(7);
  const [submitted, setSubmitted] = useState(false);
  const [, bump] = useState(0);

  const submit = useCallback(() => {
    if (submitted || !canvas.current) return;
    setSubmitted(true);
    socket.emit('submit_drawing', canvas.current.toDataURL());
  }, [submitted]);

  if (!room) return null;

  return (
    <div className="game-shell">
      <div className="game-topbar">
        <span className="round-pill">Round {room.round}/{room.settings.rounds}</span>
        <div className="prompt-banner">🎯 {room.prompt}</div>
        <Timer endsAt={room.phaseEndsAt} onZero={submit} />
      </div>

      <div className="game-grid">
        <div className="canvas-zone">
          <div className="canvas-frame">
            <DrawCanvas
              ref={canvas}
              tool={tool}
              color={color}
              size={size}
              locked={submitted}
              onHistoryChange={() => bump((n) => n + 1)}
            />
            {submitted && (
              <div className="canvas-locked">
                <span style={{ fontSize: '3rem' }}>✅</span>
                Sent to the judge!
                <span style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', fontFamily: 'var(--font-body)' }}>
                  Waiting for the other artists…
                </span>
              </div>
            )}
          </div>

          <div className="toolbar">
            <div className="tool-group">
              {TOOLS.map((t) => (
                <button
                  key={t.id}
                  className={`tool-btn ${tool === t.id ? 'active' : ''}`}
                  title={t.label}
                  disabled={submitted}
                  onClick={() => setTool(t.id)}
                >
                  {t.icon}
                </button>
              ))}
            </div>

            <div className="tool-sep" />

            <div className="size-dots">
              {SIZES.map((s) => (
                <span
                  key={s}
                  className={`size-dot ${size === s ? 'sel' : ''}`}
                  style={{ width: 10 + s, height: 10 + s }}
                  onClick={() => !submitted && setSize(s)}
                />
              ))}
            </div>

            <div className="tool-sep" />

            <div className="color-grid">
              {PALETTE.map((c) => (
                <span
                  key={c}
                  className={`color-cell ${color === c ? 'sel' : ''}`}
                  style={{ background: c }}
                  onClick={() => !submitted && setColor(c)}
                />
              ))}
            </div>
            <div className="color-current" style={{ background: color }} title="Custom color">
              <input type="color" value={color} disabled={submitted} onChange={(e) => setColor(e.target.value)} />
            </div>

            <div className="tool-sep" />

            <div className="tool-group">
              <button className="tool-btn" title="Undo" disabled={submitted || !canvas.current?.canUndo()} onClick={() => canvas.current?.undo()}>↩️</button>
              <button className="tool-btn" title="Redo" disabled={submitted || !canvas.current?.canRedo()} onClick={() => canvas.current?.redo()}>↪️</button>
              <button className="tool-btn" title="Clear all" disabled={submitted} onClick={() => canvas.current?.clear()}>🗑️</button>
            </div>

            <div style={{ flex: 1 }} />

            <button className="btn btn-mint" onClick={submit} disabled={submitted}>
              {submitted ? 'Submitted ✅' : "I'm done! 🎨"}
            </button>
          </div>
        </div>

        <Sidebar showSubmitted />
      </div>
    </div>
  );
}
