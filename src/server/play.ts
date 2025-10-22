import SpotifyWebApi from "spotify-web-api-node";
import SocketIO from "socket.io";

const wait = (delay: number) => {
  return new Promise((resolve) => setTimeout(resolve, delay));
};

export default (SpotifyWebApi: SpotifyWebApi, socket: SocketIO.Socket) => {
  let currentTitle = "";
  let currentArtists: string[] = [];

  let titleFound = false;
  let artistFound = false;

  const nextTrack = async (shouldSkip: boolean = true) => {
    try {
      if (shouldSkip) {
        await SpotifyWebApi.skipToNext();
        await wait(1000);
      }
      artistFound = false;
      titleFound = false;
      const result = await SpotifyWebApi.getMyCurrentPlayingTrack();
      if (!result.body || !result.body.item) {
        socket.emit("error", "Failed to skip to next track");
        return;
      }

      currentTitle = result.body.item.name;
      currentArtists = (
        result.body.item as SpotifyApi.TrackObjectFull
      ).artists.map((artist) => artist.name.toLowerCase());

      console.log("Current track:", currentTitle, currentArtists);
    } catch (error) {
      console.error(error);
      socket.emit("error", "Failed to skip to next track");
    }
  };

  nextTrack(false);

  socket.on("nextTrack", nextTrack);

  socket.on("answer", ({ answer, pseudo }) => {
    console.log("Answer:", answer);
    if (answer.toLowerCase() === currentTitle.toLowerCase()) {
      titleFound = true;
    }
    if (
      currentArtists.some((artist) => answer.toLowerCase().includes(artist))
    ) {
      artistFound = true;
    }

    socket.emit("reply", {
      titleFound,
      artistFound,
      answer,
      pseudo,
      message:
        titleFound && artistFound
          ? `${currentArtists.join(", ")} - ${currentTitle}`
          : undefined,
    });

    if (titleFound && artistFound) {
      nextTrack();
    }
  });
};
