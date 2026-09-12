import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const base = process.env.VITE_BASE_PATH?.trim() || "/";
if (!base.startsWith("/") || !base.endsWith("/")) {
  throw new Error("VITE_BASE_PATH must start and end with /.");
}

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:4000",
      "/health": "http://127.0.0.1:4000",
    },
  },
  build: { sourcemap: false },
});
