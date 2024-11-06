// app/game/[roomId]/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import io, { Socket } from 'socket.io-client';

let socket: Socket;

export default function GamePage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;

  const [connected, setConnected] = useState(false);
  const [gameStatus, setGameStatus] = useState('');
  const [roundResult, setRoundResult] = useState('');
  const [choice, setChoice] = useState('');

  useEffect(() => {
    // Conectar al socket solo si no está conectado
    if (!socket) {
      socket = io();

      socket.on('connect', () => {
        console.log('Conectado al socket');
        setConnected(true);
        socket.emit('joinRoom', roomId);
      });

      // Manejo de eventos
      socket.on('joinedRoom', () => {
        setGameStatus('Esperando a otro jugador...');
      });

      socket.on('startGame', () => {
        setGameStatus('¡El juego ha comenzado!');
      });

      socket.on('roundResult', (data: any) => {
        setRoundResult(data.result);
      });

      socket.on('nextRound', () => {
        console.log('Siguiente ronda');
        setRoundResult('Preparando la siguiente ronda...');
      });

      socket.on('gameOver', (data: any) => {
        setGameStatus(`¡Juego terminado! Ganador: ${data.winnerId}`);
      });

      socket.on('error', (message: string) => {
        alert(message);
        router.push('/');
      });
    }
  }, []);

  const makeChoice = (playerChoice: string) => {
    setChoice(playerChoice);
    socket.emit('makeChoice', { roomId, choice: playerChoice });
  };

  return (
    <div>
      <h1>Piedra, Papel y Tijera</h1>
      <p>{gameStatus}</p>
      {connected && (
        <div>
          <p>Elige tu jugada:</p>
          <button onClick={() => makeChoice('piedra')}>Piedra</button>
          <button onClick={() => makeChoice('papel')}>Papel</button>
          <button onClick={() => makeChoice('tijera')}>Tijera</button>
        </div>
      )}
      <p>{roundResult}</p>
    </div>
  );
}