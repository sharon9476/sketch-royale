export type Phase = 'lobby' | 'prompt' | 'drawing' | 'judging' | 'results' | 'album';

export interface PlayerInfo {
  id: string;
  name: string;
  emoji: string;
  color: string;
  score: number;
  isHost: boolean;
  connected: boolean;
  hasSubmitted: boolean;
}

export interface RoomSettings {
  rounds: number;
  drawSeconds: number;
  theme: string; // free-text vibe for the AI prompt generator, '' = anything
}

export interface JudgeResult {
  playerId: string;
  score: number; // 0-100
  comment: string;
  rank: number;
}

export interface RoundRecord {
  round: number;
  prompt: string;
  drawings: { playerId: string; name: string; emoji: string; color: string; image: string }[];
  results: JudgeResult[];
  judgeIntro: string;
}

export interface RoomState {
  code: string;
  phase: Phase;
  players: PlayerInfo[];
  settings: RoomSettings;
  round: number;
  prompt: string | null;
  phaseEndsAt: number | null; // epoch ms
  currentResults: JudgeResult[] | null;
  judgeIntro: string | null;
  album: RoundRecord[];
  aiLive: boolean; // true when a real AI key is configured
}

export interface ChatMessage {
  playerId: string;
  name: string;
  emoji: string;
  color: string;
  text: string;
  ts: number;
}

// client -> server
export interface ClientEvents {
  create_room: (p: { name: string; emoji: string; color: string }, cb: (res: { ok: true; code: string } | { ok: false; error: string }) => void) => void;
  join_room: (p: { code: string; name: string; emoji: string; color: string }, cb: (res: { ok: true; code: string } | { ok: false; error: string }) => void) => void;
  update_settings: (s: Partial<RoomSettings>) => void;
  start_game: () => void;
  submit_drawing: (image: string) => void;
  chat: (text: string) => void;
  play_again: () => void;
  leave_room: () => void;
}

// server -> client
export interface ServerEvents {
  room_state: (state: RoomState) => void;
  chat: (msg: ChatMessage) => void;
  error_toast: (msg: string) => void;
}
