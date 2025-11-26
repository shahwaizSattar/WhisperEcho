import { io, Socket } from 'socket.io-client';
import { SOCKET_BASE_URL } from './api';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_BASE_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      withCredentials: true,
    });
  } else if (!socket.connected && !socket.active) {
    socket.connect();
  }

  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
