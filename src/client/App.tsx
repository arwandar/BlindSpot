import { useSnackbar } from "notistack";
import "./App.css";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
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
  message?: string;
};

function App() {
  const [previousAnswers, setPreviousAnswers] = useState<Answer[]>([]);
  const [connected, setConnected] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const [pseudo, setPseudo] = useState(localStorage.getItem("pseudo") || "");
  const [answer, setAnswer] = useState("");

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

    socket.on("reply", (data) => {
      console.log(data);

      setPreviousAnswers((prev) => [data, ...prev]);
      if (data.titleFound && data.artistFound) {
        enqueueSnackbar(data.message, {
          variant: "success",
          autoHideDuration: 5000,
          preventDuplicate: true,
        });
      }
    });

    return () => {
      socket.off("reply");
      socket.off("error");
      socket.off("connected");
    };
  }, []);

  const handlePseudoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPseudo(event.target.value);
    localStorage.setItem("pseudo", event.target.value);
  };

  const handleNextTrack = () => {
    socket.emit("nextTrack");
    setAnswer("");
    setPreviousAnswers([]);
  };

  const handleSendAnswer = () => {
    socket.emit("answer", { answer, pseudo });
    setAnswer("");
  };

  return (
    <Grid container>
      <Grid size={12}>
        <Typography variant="h1">BlindSpot</Typography>
      </Grid>

      <Grid size={12} container justifyContent="space-between">
        {connected ? (
          <Button onClick={handleNextTrack}>Next track</Button>
        ) : (
          <Button onClick={() => window.location.replace("/login")}>
            Login
          </Button>
        )}
        <TextField
          label="Pseudo"
          value={pseudo}
          onChange={handlePseudoChange}
          variant="filled"
          size="small"
        />
      </Grid>

      <Grid size={12} sx={{ marginTop: "1rem" }}>
        <TextField
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          label="Reponse"
          variant="filled"
          fullWidth
          multiline={true}
          rows={5}
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
        <List dense={true}>
          {previousAnswers.map((answer, index) => (
            <ListItem key={index}>
              {answer.pseudo}: {answer.answer}{" "}
              <MusicNote color={answer.titleFound ? "success" : "error"} />
              <Mic color={answer.artistFound ? "success" : "error"} />
            </ListItem>
          ))}
        </List>
      </Grid>
    </Grid>
  );
}

export default App;
