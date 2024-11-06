// app/game/[roomId]/socket.ts

import { NextApiRequest, NextApiResponse } from "next";
import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { Server as IOServer } from "socket.io";
import type { Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";

interface ExtendedNextApiResponse extends NextApiResponse {
	socket: any;
}

interface Player {
	id: string;
	choice: string | null;
	score: number;
}

interface GameRoom {
	id: string;
	players: Player[];
	roundsPlayed: number;
}

const gameRooms: { [key: string]: GameRoom } = {};

export default function handler(
	req: NextApiRequest,
	res: ExtendedNextApiResponse
) {
	if (!res.socket.server.io) {
		console.log("Inicializando Socket.IO");

		const io = new SocketIOServer(res.socket.server);

		res.socket.server.io = io;

		io.on("connection", (socket: Socket) => {
			console.log("Usuario conectado:", socket.id);

			// Manejo de eventos
			socket.on("joinRoom", (roomId: string) => {
				// Lógica para unirse a una sala
				// ... (ver siguiente sección para detalles)
			});

			socket.on("makeChoice", (data: { roomId: string; choice: string }) => {
				// Lógica para procesar la elección del jugador
				// ... (ver siguiente sección para detalles)
			});

			socket.on("disconnect", () => {
				// Manejar desconexiones
				// ... (ver siguiente sección para detalles)
			});
		});

		// ... código anterior ...

		io.on("connection", (socket: Socket) => {
			console.log("Usuario conectado:", socket.id);

			socket.on("joinRoom", (roomId: string) => {
				try {
					let room = gameRooms[roomId];
					if (!room) {
						room = {
							id: roomId,
							players: [],
							roundsPlayed: 0,
						};
						gameRooms[roomId] = room;
					}

					if (room.players.length >= 2) {
						socket.emit("error", "La sala está llena.");
						return;
					}

					const player: Player = {
						id: socket.id,
						choice: null,
						score: 0,
					};

					room.players.push(player);
					socket.join(roomId);
					socket.emit("joinedRoom", roomId);

					if (room.players.length === 2) {
						io.to(roomId).emit("startGame");
					}
				} catch (error) {
					console.error("Error al unirse a la sala:", error);
					socket.emit("error", "Error al unirse a la sala");
				}
			});

			socket.on("makeChoice", (data: { roomId: string; choice: string }) => {
				try {
					const room = gameRooms[data.roomId];
					if (!room) {
						socket.emit("error", "La sala no existe.");
						return;
					}

					const player = room.players.find((p) => p.id === socket.id);
					if (!player) {
						socket.emit("error", "El jugador no está en la sala.");
						return;
					}

					if (!["piedra", "papel", "tijera"].includes(data.choice)) {
						socket.emit("error", "Elección inválida.");
						return;
					}

					player.choice = data.choice;

					if (room.players.every((p) => p.choice !== null)) {
						// Ambos jugadores han hecho su elección
						const [player1, player2] = room.players;
						const result = determineWinner(player1.choice!, player2.choice!);

						if (result === 0) {
							io.to(room.id).emit("roundResult", { result: "Empate" });
						} else {
							const winner = result === 1 ? player1 : player2;
							winner.score += 1;
							io.to(room.id).emit("roundResult", {
								result: `Jugador ${winner.id} gana la ronda`,
							});
						}

						room.roundsPlayed += 1;
						room.players.forEach((p) => (p.choice = null));

						// Verificar si alguien ha ganado el mejor de 3
						const winningScore = 2;
						const gameWinner = room.players.find(
							(p) => p.score === winningScore
						);
						if (gameWinner) {
							io.to(room.id).emit("gameOver", { winnerId: gameWinner.id });
							delete gameRooms[room.id];
						} else {
							io.to(room.id).emit("nextRound");
						}
					}
				} catch (error) {
					console.error("Error al procesar la elección:", error);
					socket.emit("error", "Error al procesar la elección");
				}
			});

			socket.on("disconnect", () => {
				try {
					// Manejar la desconexión del jugador
					for (const roomId in gameRooms) {
						const room = gameRooms[roomId];
						const playerIndex = room.players.findIndex(
							(p) => p.id === socket.id
						);
						if (playerIndex !== -1) {
							room.players.splice(playerIndex, 1);
							io.to(roomId).emit("playerLeft", { playerId: socket.id });
							delete gameRooms[roomId];
							break;
						}
					}
				} catch (error) {
					console.error("Error al manejar la desconexión:", error);
				}
			});
		});

		// Función para determinar el ganador de una ronda
		function determineWinner(choice1: string, choice2: string): number {
			const beats: { [key: string]: string } = {
				piedra: "tijera",
				papel: "piedra",
				tijera: "papel",
			};

			if (choice1 === choice2) {
				return 0; // Empate
			} else if (beats[choice1] === choice2) {
				return 1; // Gana el primer jugador
			} else {
				return 2; // Gana el segundo jugador
			}
		}
	} else {
		console.log("Socket.IO ya estaba inicializado");
	}

	res.end();
}
