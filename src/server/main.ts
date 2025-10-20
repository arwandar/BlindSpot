import express from "express";
import ViteExpress from "vite-express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

const app = express();

const clients = new Set();

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("Un client connecté", socket.id);

  clients.add(socket.id);

  socket.on("message", (data) => {
    console.log("Reçu du client:", data);
    socket.emit("reply", { msg: "Salut du serveur 👋" });
  });

  socket.on("disconnect", () => {
    console.log("Client déconnecté:", socket.id);
    clients.delete(socket.id);
  });
});

// Ici, on fait écouter *le serveur HTTP*, pas ViteExpress directement
const PORT = 5174;

server.listen(PORT, () => {
  console.log(`Serveur backend + Vite sur http://localhost:${PORT}`);
});

// On monte ViteExpress dessus (il ajoute le middleware pour ton front)
ViteExpress.bind(app, server);
