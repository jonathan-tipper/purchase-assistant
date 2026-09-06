import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
export default defineConfig({
  server: { host: "127.0.0.1", port: 8080 },
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  build: {
    target: "es2022",
    rollupOptions: {
      output: { manualChunks: { "cloud-client": ["@supabase/supabase-js"] } },
    },
  },
});
