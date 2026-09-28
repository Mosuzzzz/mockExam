import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const appDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: appDir,
  envDir: resolve(appDir, "../.."),
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: { outDir: "dist", emptyOutDir: true },
});
