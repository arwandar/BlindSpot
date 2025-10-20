import "./App.css";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const socket: Socket = io("/");

function App() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    // Quand le serveur envoie une réponse
    socket.on("reply", (data) => {
      setMessages((prev) => [...prev, "Serveur : " + data.msg]);
    });

    // Nettoyage à la fermeture du composant
    return () => {
      socket.off("reply");
    };
  }, []);

  const sendMessage = () => {
    if (input.trim()) {
      socket.emit("message", input);
      setMessages((prev) => [...prev, "Moi : " + input]);
      setInput("");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>💬 Chat WebSocket</h1>

      <div
        style={{
          border: "1px solid #ccc",
          padding: "1rem",
          height: "200px",
          overflowY: "auto",
        }}
      >
        {messages.map((msg, i) => (
          <div key={i}>{msg}</div>
        ))}
      </div>

      <div style={{ marginTop: "1rem" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tape un message..."
          style={{ padding: "0.5rem", width: "70%" }}
        />
        <button
          onClick={sendMessage}
          style={{ padding: "0.5rem 1rem", marginLeft: "0.5rem" }}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}

export default App;
