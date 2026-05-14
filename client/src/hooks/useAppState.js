import { useState, useEffect } from 'react';
import socket from '../socket';

export function useAppState() {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('state', (s) => setState(s));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('state');
    };
  }, []);

  return { state, connected };
}
