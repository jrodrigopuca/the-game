// app/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [roomIdInput, setRoomIdInput] = useState('');
  const [invitationLink, setInvitationLink] = useState('');
  const router = useRouter();

  const createRoom = async () => {
    const response = await fetch('/api/create-room');
    const data = await response.json();
    const link = `${window.location.origin}/game/${data.roomId}`;
    setInvitationLink(link);
  };

  const joinRoom = () => {
    if (roomIdInput.trim()) {
      router.push(`/game/${roomIdInput.trim()}`);
    }
  };

  return (
    <div>
      <h1>Piedra, Papel y Tijera</h1>
      <button onClick={createRoom}>Crear Sala</button>
      {invitationLink && (
        <p>
          Enlace de invitación: <a href={invitationLink}>{invitationLink}</a>
        </p>
      )}
      <div>
        <input
          type="text"
          placeholder="ID de la sala"
          value={roomIdInput}
          onChange={(e) => setRoomIdInput(e.target.value)}
        />
        <button onClick={joinRoom}>Unirse a Sala</button>
      </div>
    </div>
  );
}