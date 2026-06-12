# 🎨 Sketch Royale

A multiplayer drawing game that mashes up **Skribbl.io** and **Gartic Phone** — with an **AI as the prompt generator and judge**.

Every round, the AI invents one funny prompt and gives it to **everyone** at the same time. All players draw their own interpretation under a time limit. Then the AI judge ("Judge Pixel" 🧐) reviews every drawing, scores it 0–100 for accuracy + creativity, and roasts it lovingly. After the final round you get a Gartic-Phone-style **Album**: every prompt, every drawing, every score and AI comment, with a podium and a shareable recap.

## Quick start

```bash
npm install
npm run dev
```

Open **http://localhost:5173** in two browser tabs (or share with friends on your network), create a room, share the 4-letter code, and play.

> The game works out of the box with **no API key** — the AI runs in demo mode (built-in prompts + a mock judge with random-ish scores and canned wit).

## Enabling the real AI

Set an API key before starting the server (any OpenAI-compatible chat API with vision works):

```bash
# .env or shell environment
OPENAI_API_KEY=sk-...
# optional overrides:
AI_BASE_URL=https://api.openai.com/v1
AI_TEXT_MODEL=gpt-4o-mini      # prompt generation
AI_VISION_MODEL=gpt-4o-mini    # drawing judging (needs vision)
```

With a key set, the AI generates a fresh prompt each round (respecting the host's optional theme) and judges every submitted PNG with real image understanding.

## Game flow

1. **Lobby** — host configures rounds (1–10), drawing time (20–300s), and an optional prompt theme. Up to 10 players.
2. **Prompt reveal** — the AI generates one prompt, shown to everyone for 5 seconds.
3. **Drawing** — everyone draws the same prompt. Tools: pen, eraser, **bucket fill**, line, rectangle, ellipse, 18-color palette + custom color picker, 4 brush sizes, undo/redo, clear. Auto-submits when the timer hits zero; the round ends early if everyone hits "I'm done".
4. **Judging** — the AI scores each drawing (0–100) with a witty comment. Points: score/2 + podium bonus (25/15/10).
5. **Results** — gallery of all drawings with scores, comments, and a crowned winner.
6. **Album** — after the last round: podium, every round's full gallery with AI commentary, click-to-download drawings, and a copy-to-clipboard text recap.

## Production

```bash
npm run build   # builds the client to dist/
npm start       # serves client + game server on PORT (default 3001)
```

## Stack

- **Client:** React 18 + Vite + TypeScript, hand-rolled canvas engine (scanline flood fill, shape previews, ImageData undo stack)
- **Server:** Node.js + Express + Socket.IO — authoritative room/phase state machine
- **AI:** any OpenAI-compatible LLM + vision API, with a zero-config mock fallback
