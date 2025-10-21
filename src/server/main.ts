import express from "express";
import ViteExpress from "vite-express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { getEnvVariable } from "./getEnvVariable";

import SpotifyWebApi from "spotify-web-api-node";
import login from "./login";
import play from "./play";

const spotifyApi = new SpotifyWebApi({
  clientId: getEnvVariable("SPOTIFY_CLIENT_ID"),
  clientSecret: getEnvVariable("SPOTIFY_CLIENT_SECRET"),
  redirectUri: getEnvVariable("SPOTIFY_REDIRECT_URI"),
});

const app = express();
login(app, spotifyApi);

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("Un client connecté", socket.id);
  if (!spotifyApi.getAccessToken()) {
    socket.emit("error", "You need to login first");
    return;
  } else {
    play(spotifyApi, socket);
  }

  console.log(spotifyApi.getAccessToken());
  spotifyApi
    .getMyCurrentPlaybackState()
    .then((data) => {
      console.log(data);
      socket.emit("ok", data);
    })
    .catch((err) => {
      console.error(err);
      socket.emit("error", err);
    });

  socket.on("message", (data) => {
    console.log("Reçu du client:", data);
    socket.emit("reply", { msg: "Salut du serveur 👋" });
  });

  socket.on("disconnect", () => {
    console.log("Client déconnecté:", socket.id);
  });
});

const PORT = getEnvVariable("PORT") || 5174;

server.listen(PORT, () => {
  console.log(`Serveur backend + Vite sur http://localhost:${PORT}`);
});

ViteExpress.bind(app, server);
