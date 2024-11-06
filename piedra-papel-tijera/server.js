// server.js

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let gameRooms = {};

function determineWinner(choice1, choice2) {
	const beats = {
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

app.prepare().then(() => {
	const server = createServer((req, res) => {
		// Manejar las solicitudes Next.js
		handle(req, res);
	});

	const io = new Server(server);

	io.on("connection", (socket) => {
		console.log("Usuario conectado:", socket.id);

		socket.on("joinRoom", (roomId) => {
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

				const player = {
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

		socket.on("makeChoice", (data) => {
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

				console.log(`Jugador ${player.id} eligió: ${data.choice}`);
				player.choice = data.choice;

				if (room.players.every((p) => p.choice !== null)) {
					console.log("Ambos jugadores han hecho su elección");
					// Ambos jugadores han hecho su elección
					const [player1, player2] = room.players;
					const result = determineWinner(player1.choice, player2.choice);

					if (result === 0) {
						console.log("Empate");
						io.to(room.id).emit("roundResult", { result: "Empate" });
					} else {
						console.log(`Jugador ${result} gana la ronda`);
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
					const gameWinner = room.players.find((p) => p.score === winningScore);
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
					const playerIndex = room.players.findIndex((p) => p.id === socket.id);
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

	server.listen(port, (err) => {
		if (err) throw err;
		console.log(`> Servidor listo en http://${hostname}:${port}`);
	});
});
