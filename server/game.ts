import type { Server, Socket } from 'socket.io';
import type { Phase, PlayerInfo, RoomSettings, RoomState, RoundRecord, JudgeResult } from '../shared/types.js';
import { generatePrompt, judgeDrawings, aiLive } from './ai.js';

const PROMPT_REVEAL_MS = 5000;
const RESULTS_MS = 14000;
const SUBMIT_GRACE_MS = 4000;

interface Player {
  id: string;
  socketId: string;
  name: string;
  emoji: string;
  color: string;
  score: number;
  connected: boolean;
  hasSubmitted: boolean;
}

interface Room {
  code: string;
  hostId: string;
  phase: Phase;
  players: Map<string, Player>; // keyed by stable player id (socket id at join time)
  settings: RoomSettings;
  round: number;
  prompt: string | null;
  usedPrompts: string[];
  drawings: Map<string, string>; // playerId -> data URL
  currentResults: JudgeResult[] | null;
  judgeIntro: string | null;
  album: RoundRecord[];
  phaseEndsAt: number | null;
  timer: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, Room>();

function makeCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function toState(room: Room): RoomState {
  const players: PlayerInfo[] = [...room.players.values()].map((p) => ({
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    color: p.color,
    score: p.score,
    isHost: p.id === room.hostId,
    connected: p.connected,
    hasSubmitted: p.hasSubmitted,
  }));
  return {
    code: room.code,
    phase: room.phase,
    players,
    settings: room.settings,
    round: room.round,
    prompt: room.phase === 'lobby' ? null : room.prompt,
    phaseEndsAt: room.phaseEndsAt,
    currentResults: room.currentResults,
    judgeIntro: room.judgeIntro,
    album: room.album,
    aiLive,
  };
}

export function setupGame(io: Server) {
  const broadcast = (room: Room) => io.to(room.code).emit('room_state', toState(room));

  const clearTimer = (room: Room) => {
    if (room.timer) clearTimeout(room.timer);
    room.timer = null;
  };

  const setPhaseTimer = (room: Room, ms: number, fn: () => void) => {
    clearTimer(room);
    room.phaseEndsAt = Date.now() + ms;
    room.timer = setTimeout(fn, ms);
  };

  async function startRound(room: Room) {
    room.round += 1;
    room.drawings.clear();
    room.currentResults = null;
    room.judgeIntro = null;
    for (const p of room.players.values()) p.hasSubmitted = false;

    room.phase = 'prompt';
    room.phaseEndsAt = null;
    broadcast(room); // show "AI is thinking" while we generate

    room.prompt = await generatePrompt(room.settings.theme, room.usedPrompts);
    room.usedPrompts.push(room.prompt);
    if (!rooms.has(room.code)) return;

    setPhaseTimer(room, PROMPT_REVEAL_MS, () => startDrawing(room));
    broadcast(room);
  }

  function startDrawing(room: Room) {
    room.phase = 'drawing';
    setPhaseTimer(room, room.settings.drawSeconds * 1000 + SUBMIT_GRACE_MS, () => startJudging(room));
    // clients see the real deadline (without grace) so the bar hits zero on time
    room.phaseEndsAt = Date.now() + room.settings.drawSeconds * 1000;
    broadcast(room);
  }

  async function startJudging(room: Room) {
    if (room.phase !== 'drawing') return;
    room.phase = 'judging';
    room.phaseEndsAt = null;
    clearTimer(room);
    broadcast(room);

    const entries = [...room.players.values()]
      .filter((p) => p.connected && room.drawings.has(p.id))
      .map((p) => ({ playerId: p.id, name: p.name, image: room.drawings.get(p.id)! }));

    let intro = 'The verdict is in!';
    let results: JudgeResult[] = [];
    if (entries.length > 0) {
      const verdict = await judgeDrawings(room.prompt ?? '', entries);
      intro = verdict.intro;
      const sorted = [...verdict.results].sort((a, b) => b.score - a.score);
      results = sorted.map((r, i) => ({ ...r, rank: i + 1 }));
    }
    if (!rooms.has(room.code)) return;

    // award points: score/10 rounded, plus podium bonus
    const bonus = [25, 15, 10];
    for (const r of results) {
      const p = room.players.get(r.playerId);
      if (p) p.score += Math.round(r.score / 2) + (bonus[r.rank - 1] ?? 0);
    }

    room.currentResults = results;
    room.judgeIntro = intro;
    room.album.push({
      round: room.round,
      prompt: room.prompt ?? '',
      drawings: entries.map((e) => {
        const p = room.players.get(e.playerId)!;
        return { playerId: e.playerId, name: p.name, emoji: p.emoji, color: p.color, image: e.image };
      }),
      results,
      judgeIntro: intro,
    });

    room.phase = 'results';
    setPhaseTimer(room, RESULTS_MS, () => {
      if (room.round >= room.settings.rounds) {
        room.phase = 'album';
        room.phaseEndsAt = null;
        clearTimer(room);
        broadcast(room);
      } else {
        void startRound(room);
      }
    });
    broadcast(room);
  }

  function maybeFinishDrawing(room: Room) {
    if (room.phase !== 'drawing') return;
    const active = [...room.players.values()].filter((p) => p.connected);
    if (active.length > 0 && active.every((p) => p.hasSubmitted)) {
      void startJudging(room);
    }
  }

  io.on('connection', (socket: Socket) => {
    let myRoom: Room | null = null;
    let myId: string = socket.id;

    const leave = () => {
      if (!myRoom) return;
      const room = myRoom;
      const player = room.players.get(myId);
      if (player) {
        if (room.phase === 'lobby') {
          room.players.delete(myId);
        } else {
          player.connected = false;
        }
      }
      socket.leave(room.code);
      myRoom = null;

      const remaining = [...room.players.values()].filter((p) => p.connected);
      if (remaining.length === 0) {
        clearTimer(room);
        rooms.delete(room.code);
        return;
      }
      if (room.hostId === myId) {
        room.hostId = remaining[0].id;
      }
      maybeFinishDrawing(room);
      broadcast(room);
    };

    socket.on('create_room', (p, cb) => {
      if (typeof cb !== 'function') return;
      const name = String(p?.name ?? '').trim().slice(0, 16);
      if (!name) return cb({ ok: false, error: 'Pick a name first!' });
      const room: Room = {
        code: makeCode(),
        hostId: socket.id,
        phase: 'lobby',
        players: new Map(),
        settings: { rounds: 3, drawSeconds: 90, theme: '' },
        round: 0,
        prompt: null,
        usedPrompts: [],
        drawings: new Map(),
        currentResults: null,
        judgeIntro: null,
        album: [],
        phaseEndsAt: null,
        timer: null,
      };
      room.players.set(socket.id, {
        id: socket.id, socketId: socket.id, name,
        emoji: String(p.emoji ?? '🐸').slice(0, 8),
        color: String(p.color ?? '#ffcc2e').slice(0, 16),
        score: 0, connected: true, hasSubmitted: false,
      });
      rooms.set(room.code, room);
      myRoom = room;
      myId = socket.id;
      socket.join(room.code);
      cb({ ok: true, code: room.code });
      broadcast(room);
    });

    socket.on('join_room', (p, cb) => {
      if (typeof cb !== 'function') return;
      const code = String(p?.code ?? '').trim().toUpperCase();
      const name = String(p?.name ?? '').trim().slice(0, 16);
      if (!name) return cb({ ok: false, error: 'Pick a name first!' });
      const room = rooms.get(code);
      if (!room) return cb({ ok: false, error: 'Room not found. Check the code!' });
      if (room.players.size >= 10) return cb({ ok: false, error: 'Room is full (10 max).' });
      if (room.phase !== 'lobby') return cb({ ok: false, error: 'Game already in progress.' });
      room.players.set(socket.id, {
        id: socket.id, socketId: socket.id, name,
        emoji: String(p.emoji ?? '🐸').slice(0, 8),
        color: String(p.color ?? '#ffcc2e').slice(0, 16),
        score: 0, connected: true, hasSubmitted: false,
      });
      myRoom = room;
      myId = socket.id;
      socket.join(room.code);
      cb({ ok: true, code: room.code });
      broadcast(room);
    });

    socket.on('update_settings', (s) => {
      const room = myRoom;
      if (!room || room.hostId !== myId || room.phase !== 'lobby') return;
      if (typeof s?.rounds === 'number') room.settings.rounds = Math.max(1, Math.min(10, Math.round(s.rounds)));
      if (typeof s?.drawSeconds === 'number') room.settings.drawSeconds = Math.max(20, Math.min(300, Math.round(s.drawSeconds)));
      if (typeof s?.theme === 'string') room.settings.theme = s.theme.slice(0, 60);
      broadcast(room);
    });

    socket.on('start_game', () => {
      const room = myRoom;
      if (!room || room.hostId !== myId || room.phase !== 'lobby') return;
      if (room.players.size < 2) {
        socket.emit('error_toast', 'You need at least 2 players to start!');
        return;
      }
      void startRound(room);
    });

    socket.on('submit_drawing', (image) => {
      const room = myRoom;
      if (!room || room.phase !== 'drawing') return;
      if (typeof image !== 'string' || !image.startsWith('data:image/png') || image.length > 2_500_000) return;
      const player = room.players.get(myId);
      if (!player) return;
      room.drawings.set(myId, image);
      player.hasSubmitted = true;
      broadcast(room);
      maybeFinishDrawing(room);
    });

    socket.on('chat', (text) => {
      const room = myRoom;
      const player = room?.players.get(myId);
      if (!room || !player) return;
      const clean = String(text ?? '').trim().slice(0, 200);
      if (!clean) return;
      io.to(room.code).emit('chat', {
        playerId: player.id, name: player.name, emoji: player.emoji, color: player.color,
        text: clean, ts: Date.now(),
      });
    });

    socket.on('play_again', () => {
      const room = myRoom;
      if (!room || room.hostId !== myId || room.phase !== 'album') return;
      clearTimer(room);
      room.phase = 'lobby';
      room.round = 0;
      room.prompt = null;
      room.usedPrompts = [];
      room.drawings.clear();
      room.currentResults = null;
      room.judgeIntro = null;
      room.album = [];
      room.phaseEndsAt = null;
      for (const [id, p] of room.players) {
        if (!p.connected) room.players.delete(id);
        else { p.score = 0; p.hasSubmitted = false; }
      }
      broadcast(room);
    });

    socket.on('leave_room', leave);
    socket.on('disconnect', leave);
  });
}
