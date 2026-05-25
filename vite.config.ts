import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// https://vitejs.dev/config/
const uiBuildIso = new Date().toISOString();

export default defineConfig(({ mode: _mode }) => ({
  define: {
    __APP_UI_BUILD__: JSON.stringify(uiBuildIso),
  },
  server: {
    host: "::",
    port: 8081,
    hmr: {
      overlay: true,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
