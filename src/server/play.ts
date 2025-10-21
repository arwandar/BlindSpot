import SpotifyWebApi from "spotify-web-api-node";
import SocketIO from "socket.io";

export default (SpotifyWebApi: SpotifyWebApi, socket: SocketIO.Socket) => {
  let currentTitle = "";
  let currentArtists = [];

  socket.on("nextTrack", async () => {
    try {
      await SpotifyWebApi.skipToNext();
      const result = await SpotifyWebApi.getMyCurrentPlayingTrack();
      console.log(result.body);
    } catch (error) {
      console.error(error);
      socket.emit("error", "Failed to skip to next track");
    }
  });
};
