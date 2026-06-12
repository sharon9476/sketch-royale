import './env.js'; // must run before any module that reads process.env (ai.ts)
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupGame } from './game.js';
import { aiLive } from './ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  maxHttpBufferSize: 4e6, // drawings are PNG data URLs
  cors: { origin: '*' },
});

setupGame(io);

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

httpServer.listen(PORT, () => {
  console.log(`🎨 Sketch Royale server on http://localhost:${PORT}`);
  console.log(aiLive
    ? '🤖 AI judge: LIVE (API key detected)'
    : '🤖 AI judge: MOCK MODE — set OPENAI_API_KEY (or AI_API_KEY + AI_BASE_URL) for real AI prompts & judging');
});
