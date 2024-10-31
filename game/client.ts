import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

let roomId: string;

// Función para obtener el roomId de la URL
function getRoomIdFromURL(): string | null {
	const pathParts = window.location.pathname.split("/");
	if (pathParts[1] === "join" && pathParts[2]) {
		return pathParts[2];
	}
	return null;
}

// Verificar si el usuario accedió a través del enlace de invitación
const urlRoomId = getRoomIdFromURL();
if (urlRoomId) {
	roomId = urlRoomId;
	socket.emit("joinRoom", roomId);
}

document.getElementById("createRoom")!.addEventListener("click", () => {
	fetch("/create-room")
		.then((response) => response.json())
		.then((data) => {
			if (data.error) {
				displayError(data.error);
				return;
			}
			roomId = data.roomId;
			document.getElementById(
				"invitationLink"
			)!.innerText = `Enlace de invitación: ${data.invitationLink}`;
		})
		.catch((error) => {
			console.error("Error al crear la sala:", error);
			displayError("Error al crear la sala");
		});
});

document.getElementById("joinRoom")!.addEventListener("click", () => {
	const input = document.getElementById("roomIdInput") as HTMLInputElement;
	roomId = input.value.trim();
	if (!roomId) {
		displayError("Debe ingresar un ID de sala válido.");
		return;
	}
	socket.emit("joinRoom", roomId);
});

socket.on("joinedRoom", (data: any) => {
	document.getElementById(
		"gameStatus"
	)!.innerText = `Te has unido a la sala ${data.roomId}`;
});

socket.on("startGame", () => {
	document.getElementById("gameStatus")!.innerText = "¡El juego ha comenzado!";
	document.getElementById("choices")!.style.display = "block";
});

socket.on("roundResult", (data: any) => {
	document.getElementById("roundResult")!.innerText = data.result;
});

socket.on("nextRound", () => {
	document.getElementById("roundResult")!.innerText =
		"Preparando la siguiente ronda...";
});

socket.on("gameOver", (data: any) => {
	document.getElementById(
		"gameStatus"
	)!.innerText = `¡Juego terminado! Ganador: ${data.winnerId}`;
	document.getElementById("choices")!.style.display = "none";
});

socket.on("playerLeft", (data: any) => {
	displayError("El otro jugador ha abandonado la sala.");
	document.getElementById("choices")!.style.display = "none";
});

socket.on("error", (message: string) => {
	displayError(message);
});

document.querySelectorAll("#choices button").forEach((button) => {
	button.addEventListener("click", () => {
		const choice = button.getAttribute("data-choice")!;
		socket.emit("makeChoice", { roomId, choice });
	});
});

function displayError(message: string) {
	const errorElement =
		document.getElementById("error") || document.createElement("p");
	errorElement.id = "error";
	errorElement.style.color = "red";
	errorElement.innerText = message;
	document.getElementById("game")!.appendChild(errorElement);
}
