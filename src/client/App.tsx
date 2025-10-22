import { useSnackbar } from "notistack";
import "./App.css";

import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  Alert,
  Button,
  Grid,
  List,
  ListItem,
  TextField,
  Typography,
} from "@mui/material";
import { Mic, MusicNote } from "@mui/icons-material";

const socket: Socket = io("/");

type Answer = {
  answer: string;
  pseudo: string;
  titleFound: boolean;
  artistFound: boolean;
  title?: string;
  artists?: string;
  confidence: {
    title: number;
    artist: number;
  };
};

function App() {
  const [previousAnswers, setPreviousAnswers] = useState<Answer[]>([]);
  const [connected, setConnected] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const [pseudo, setPseudo] = useState(localStorage.getItem("pseudo") || "");
  const [answer, setAnswer] = useState("");
  const [hint, setHint] = useState<
    undefined | { title: string; artists: string }
  >(undefined);

  useEffect(() => {
    socket.on("error", (data) => {
      console.error(data);
      enqueueSnackbar(data, {
        variant: "error",
        autoHideDuration: 5000,
        preventDuplicate: true,
      });
    });
    socket.on("connected", () => {
      setConnected(true);
    });

    socket.on("newTrack", () => {
      setAnswer("");
      setPreviousAnswers([]);
      setHint(undefined);
    });

    socket.on("rightAnswer", (data) => {
      enqueueSnackbar(data.message, {
        variant: "success",
        autoHideDuration: 5000,
        preventDuplicate: true,
      });
    });

    socket.on("reply", (data) => {
      console.log(data);

      setPreviousAnswers((prev) => [data, ...prev]);
    });

    socket.on("hint", (data) => {
      console.log("Hint: '", data, "'");
      setHint(data);
    });

    return () => {
      socket.off("reply");
      socket.off("error");
      socket.off("connected");
      socket.off("newTrack");
      socket.off("rightAnswer");
      socket.off("hint");
    };
  }, []);

  const handlePseudoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPseudo(event.target.value);
    localStorage.setItem("pseudo", event.target.value);
  };

  const handleNextTrack = (shouldSkip: boolean = true) => {
    socket.emit("nextTrack", shouldSkip);
    setHint(undefined);
    setAnswer("");
    setPreviousAnswers([]);
  };

  const handleSendAnswer = () => {
    socket.emit("answer", { answer, pseudo });
    setAnswer("");
  };

  const handleAnswer = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setAnswer(event.target.value);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      handleSendAnswer();
    }
  };

  const { title, artists } = useMemo(() => {
    if (previousAnswers.length > 0) {
      return {
        title: previousAnswers[0].title,
        artists: previousAnswers[0].artists,
      };
    }
    return { title: undefined, artists: undefined };
  }, [previousAnswers]);

  return (
    <Grid container>
      <Grid size={12}>
        <Typography variant="h1">BlindSpot</Typography>
      </Grid>

      <Grid size={12} container justifyContent="space-between">
        <Grid size={8}>
          {connected ? (
            <>
              <Button onClick={() => handleNextTrack()}>Next track</Button>
              <Button onClick={() => handleNextTrack(false)}>
                Update track
              </Button>
            </>
          ) : (
            <Button onClick={() => window.location.replace("/login")}>
              Login
            </Button>
          )}
        </Grid>

        <Grid size={4}>
          <TextField
            label="Pseudo"
            value={pseudo}
            onChange={handlePseudoChange}
            variant="filled"
            size="small"
          />
        </Grid>
      </Grid>

      <Grid size={12} sx={{ marginTop: "1rem" }}>
        <TextField
          value={answer}
          onChange={handleAnswer}
          onKeyDown={handleKeyPress}
          label="Reponse"
          variant="filled"
          fullWidth
          disabled={!connected}
        />
      </Grid>

      <Grid size={12} sx={{ marginTop: "1rem" }}>
        <Button
          onClick={handleSendAnswer}
          variant="contained"
          fullWidth
          disabled={!connected}
        >
          Envoyer la reponse
        </Button>
      </Grid>
      <Grid size={12} sx={{ marginTop: "1rem" }}>
        <Button
          onClick={() => socket.emit("hint")}
          variant="outlined"
          fullWidth
        >
          Hint
        </Button>
      </Grid>

      <Grid size={12} sx={{ marginTop: "1rem" }}>
        {(title || hint) && (
          <Alert icon={<MusicNote />} severity={title ? "success" : "warning"}>
            {title || hint?.title}
          </Alert>
        )}
        {(artists || hint) && (
          <Alert icon={<Mic />} severity={artists ? "success" : "warning"}>
            {artists || hint?.artists}
          </Alert>
        )}
      </Grid>

      <Grid size={12} sx={{ marginTop: "1rem" }}>
        <List dense={true}>
          {previousAnswers.map((answer, index) => (
            <ListItem key={index} onClick={() => setAnswer(answer.answer)}>
              {answer.pseudo}: {answer.answer}{" "}
              <MusicNote
                color={
                  answer.titleFound
                    ? "success"
                    : answer.confidence.title > 0.5
                    ? "warning"
                    : "error"
                }
              />
              <Mic
                color={
                  answer.artistFound
                    ? "success"
                    : answer.confidence.artist > 0.5
                    ? "warning"
                    : "error"
                }
              />
            </ListItem>
          ))}
        </List>
      </Grid>
    </Grid>
  );
}

export default App;
