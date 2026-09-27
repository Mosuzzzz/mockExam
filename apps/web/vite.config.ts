import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const appDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: appDir,
  envDir: resolve(appDir, "../.."),
  envPrefix: ["VITE_", "CLERK_PUBLISHABLE_KEY"],
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { "/api": "http://localhost:3001" },
  },
  build: { outDir: "dist", emptyOutDir: true },
});
