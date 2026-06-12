import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

export const CANVAS_W = 800;
export const CANVAS_H = 600;

export type Tool = 'pen' | 'eraser' | 'bucket' | 'line' | 'rect' | 'ellipse';

export interface DrawCanvasHandle {
  toDataURL: () => string;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

interface Props {
  tool: Tool;
  color: string;
  size: number;
  locked: boolean;
  onHistoryChange?: () => void;
}

function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

// scanline flood fill with small tolerance for anti-aliased edges
function floodFill(ctx: CanvasRenderingContext2D, x: number, y: number, fill: [number, number, number, number]) {
  const img = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
  const data = img.data;
  const idx = (px: number, py: number) => (py * CANVAS_W + px) * 4;
  const start = idx(x, y);
  const target = [data[start], data[start + 1], data[start + 2], data[start + 3]];
  const TOL = 32;
  const matches = (i: number) =>
    Math.abs(data[i] - target[0]) <= TOL &&
    Math.abs(data[i + 1] - target[1]) <= TOL &&
    Math.abs(data[i + 2] - target[2]) <= TOL &&
    Math.abs(data[i + 3] - target[3]) <= TOL;
  const sameAsFill =
    target[0] === fill[0] && target[1] === fill[1] && target[2] === fill[2] && target[3] === fill[3];
  if (sameAsFill) return;

  const stack: [number, number][] = [[x, y]];
  const visited = new Uint8Array(CANVAS_W * CANVAS_H);

  while (stack.length) {
    const [cx, cy] = stack.pop()!;
    let px = cx;
    // walk left
    while (px >= 0 && matches(idx(px, cy)) && !visited[cy * CANVAS_W + px]) px--;
    px++;
    let spanUp = false;
    let spanDown = false;
    while (px < CANVAS_W && matches(idx(px, cy)) && !visited[cy * CANVAS_W + px]) {
      const i = idx(px, cy);
      data[i] = fill[0]; data[i + 1] = fill[1]; data[i + 2] = fill[2]; data[i + 3] = fill[3];
      visited[cy * CANVAS_W + px] = 1;
      if (cy > 0) {
        const m = matches(idx(px, cy - 1)) && !visited[(cy - 1) * CANVAS_W + px];
        if (m && !spanUp) { stack.push([px, cy - 1]); spanUp = true; }
        else if (!m) spanUp = false;
      }
      if (cy < CANVAS_H - 1) {
        const m = matches(idx(px, cy + 1)) && !visited[(cy + 1) * CANVAS_W + px];
        if (m && !spanDown) { stack.push([px, cy + 1]); spanDown = true; }
        else if (!m) spanDown = false;
      }
      px++;
    }
  }
  ctx.putImageData(img, 0, 0);
}

const DrawCanvas = forwardRef<DrawCanvasHandle, Props>(function DrawCanvas(
  { tool, color, size, locked, onHistoryChange },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const undoStack = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);
  const drawing = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const last = useRef({ x: 0, y: 0 });
  const [, bump] = useState(0);

  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const sizeRef = useRef(size);
  const lockedRef = useRef(locked);
  toolRef.current = tool;
  colorRef.current = color;
  sizeRef.current = size;
  lockedRef.current = locked;

  const getCtx = () => canvasRef.current!.getContext('2d', { willReadFrequently: true })!;

  const notify = () => {
    bump((n) => n + 1);
    onHistoryChange?.();
  };

  const snapshot = () => {
    const ctx = getCtx();
    undoStack.current.push(ctx.getImageData(0, 0, CANVAS_W, CANVAS_H));
    if (undoStack.current.length > 40) undoStack.current.shift();
    redoStack.current = [];
    notify();
  };

  useImperativeHandle(ref, () => ({
    toDataURL: () => canvasRef.current!.toDataURL('image/png'),
    undo: () => {
      if (!undoStack.current.length) return;
      const ctx = getCtx();
      redoStack.current.push(ctx.getImageData(0, 0, CANVAS_W, CANVAS_H));
      ctx.putImageData(undoStack.current.pop()!, 0, 0);
      notify();
    },
    redo: () => {
      if (!redoStack.current.length) return;
      const ctx = getCtx();
      undoStack.current.push(ctx.getImageData(0, 0, CANVAS_W, CANVAS_H));
      ctx.putImageData(redoStack.current.pop()!, 0, 0);
      notify();
    },
    clear: () => {
      snapshot();
      const ctx = getCtx();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    },
    canUndo: () => undoStack.current.length > 0,
    canRedo: () => redoStack.current.length > 0,
  }));

  useEffect(() => {
    const ctx = getCtx();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }, []);

  useEffect(() => {
    const canvas = previewRef.current!;

    const pos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: Math.round(((e.clientX - r.left) / r.width) * CANVAS_W),
        y: Math.round(((e.clientY - r.top) / r.height) * CANVAS_H),
      };
    };

    const strokeStyle = (ctx: CanvasRenderingContext2D) => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = sizeRef.current;
      ctx.strokeStyle = toolRef.current === 'eraser' ? '#ffffff' : colorRef.current;
    };

    const onDown = (e: PointerEvent) => {
      if (lockedRef.current || e.button !== 0) return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      const p = pos(e);
      const t = toolRef.current;

      if (t === 'bucket') {
        snapshot();
        floodFill(getCtx(), Math.max(0, Math.min(CANVAS_W - 1, p.x)), Math.max(0, Math.min(CANVAS_H - 1, p.y)), hexToRgba(colorRef.current));
        return;
      }

      drawing.current = true;
      start.current = p;
      last.current = p;
      snapshot();

      if (t === 'pen' || t === 'eraser') {
        const ctx = getCtx();
        strokeStyle(ctx);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 0.01, p.y + 0.01);
        ctx.stroke();
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!drawing.current) return;
      const p = pos(e);
      const t = toolRef.current;

      if (t === 'pen' || t === 'eraser') {
        const ctx = getCtx();
        strokeStyle(ctx);
        ctx.beginPath();
        ctx.moveTo(last.current.x, last.current.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        last.current = p;
      } else {
        // shape preview
        const pctx = canvas.getContext('2d')!;
        pctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        strokeStyle(pctx);
        drawShape(pctx, t, start.current, p);
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!drawing.current) return;
      drawing.current = false;
      const p = pos(e);
      const t = toolRef.current;
      if (t === 'line' || t === 'rect' || t === 'ellipse') {
        const pctx = canvas.getContext('2d')!;
        pctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        const ctx = getCtx();
        strokeStyle(ctx);
        drawShape(ctx, t, start.current, p);
      }
    };

    const drawShape = (
      ctx: CanvasRenderingContext2D,
      t: Tool,
      a: { x: number; y: number },
      b: { x: number; y: number }
    ) => {
      ctx.beginPath();
      if (t === 'line') {
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      } else if (t === 'rect') {
        ctx.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      } else if (t === 'ellipse') {
        ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
      }
      ctx.stroke();
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: CANVAS_W }}>
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} style={{ width: '100%', borderRadius: 'inherit' }} />
      <canvas
        ref={previewRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
    </div>
  );
});

export default DrawCanvas;
