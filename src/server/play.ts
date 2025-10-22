import SpotifyWebApi from "spotify-web-api-node";
import SocketIO from "socket.io";
import { validateBlindTest } from "./validateAnswer";

const wait = (delay: number) => {
  return new Promise((resolve) => setTimeout(resolve, delay));
};

const players = new Map<string, SocketIO.Socket>();

export default (SpotifyWebApi: SpotifyWebApi, io: SocketIO.Server) => {
  let currentTitle = "";
  let currentArtists: string[] = [];

  let titleFound = false;
  let artistFound = false;

  io.on("connection", (socket) => {
    console.log("Un client connecté", socket.id);
    players.set(socket.id, socket);
    if (!SpotifyWebApi.getAccessToken()) {
      socket.emit("error", "You need to login first");
      return;
    } else {
      socket.emit("connected");
      if (!currentTitle) {
        nextTrack(false);
      }
    }

    socket.on("disconnect", () => {
      console.log("Un client déconnecté", socket.id);
      players.delete(socket.id);
    });

    socket.on("nextTrack", nextTrack);

    socket.on("answer", ({ answer, pseudo }) => {
      console.log("Answer:", answer);
      const { titleMatch, artistMatch, confidence, debug } = validateBlindTest(
        answer,
        currentTitle,
        currentArtists
      );

      titleFound = titleFound || titleMatch;
      artistFound = artistFound || artistMatch;

      players.forEach((player) =>
        player.emit("reply", {
          titleFound: titleMatch,
          artistFound: artistMatch,
          answer,
          pseudo,
          confidence,
          title: titleFound ? currentTitle : undefined,
          artists: artistFound ? currentArtists.join(", ") : undefined,
        })
      );

      if (titleFound && artistFound) {
        nextTrack();
      }
    });

    socket.on("hint", () => {
      players.forEach((player) =>
        player.emit("hint", {
          title: currentTitle.replace(/[\p{L}\p{N}]/gu, "•"),
          artists: currentArtists.join(", ").replace(/[\p{L}\p{N}]/gu, "•"),
        })
      );
    });
  });

  const nextTrack = async (shouldSkip: boolean = true) => {
    try {
      if (shouldSkip) {
        players.forEach((player) =>
          player.emit("rightAnswer", {
            message: `${currentArtists.join(", ")} - ${currentTitle}`,
          })
        );
        await SpotifyWebApi.skipToNext();
        await wait(1000);
      }
      artistFound = false;
      titleFound = false;
      const result = await SpotifyWebApi.getMyCurrentPlayingTrack();
      if (!result.body || !result.body.item) {
        players.forEach((player) => player.emit("error", "No track playing"));
        return;
      }

      currentTitle = result.body.item.name;
      currentArtists = (
        result.body.item as SpotifyApi.TrackObjectFull
      ).artists.map((artist) => artist.name);

      const {
        name,
        artists: plop,
        ...rest
      } = result.body.item as SpotifyApi.TrackObjectFull;
      console.log("response", currentTitle, currentArtists, rest);

      players.forEach((player) => player.emit("newTrack"));
    } catch (error) {
      console.error(error);
      players.forEach((player) =>
        player.emit("error", "Failed to skip to next track")
      );
    }
  };
};
