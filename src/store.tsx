import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { RoomState, ChatMessage } from '../shared/types';
import { socket } from './socket';

interface Store {
  room: RoomState | null;
  chatLog: ChatMessage[];
  toast: string | null;
  myId: string;
  setToast: (t: string | null) => void;
  resetRoom: () => void;
}

const Ctx = createContext<Store>(null!);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [myId, setMyId] = useState<string>(socket.id ?? '');

  useEffect(() => {
    const onConnect = () => setMyId(socket.id ?? '');
    const onState = (s: RoomState) => setRoom(s);
    const onChat = (m: ChatMessage) => setChatLog((log) => [...log.slice(-99), m]);
    const onError = (msg: string) => setToast(msg);

    socket.on('connect', onConnect);
    socket.on('room_state', onState);
    socket.on('chat', onChat);
    socket.on('error_toast', onError);
    return () => {
      socket.off('connect', onConnect);
      socket.off('room_state', onState);
      socket.off('chat', onChat);
      socket.off('error_toast', onError);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const resetRoom = () => {
    socket.emit('leave_room');
    setRoom(null);
    setChatLog([]);
  };

  return <Ctx.Provider value={{ room, chatLog, toast, myId, setToast, resetRoom }}>{children}</Ctx.Provider>;
}
