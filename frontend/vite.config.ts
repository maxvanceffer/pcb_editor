import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => ({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 7060,
    proxy: mode === "development"
      ? {
          "/api": {
            target: process.env.VITE_API_URL ?? "http://localhost:7050",
            changeOrigin: true,
          },
        }
      : undefined,
  },
}));
