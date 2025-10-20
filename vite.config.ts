import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "react-windowed-select": "react-windowed-select/dist/main.js",
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:5174",
      "/socket.io": {
        target: "ws://localhost:5174",
        ws: true,
      },
    },
  },
});
