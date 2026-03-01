import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    base: "/scattered-photos/",
    server: {
      port: 3001,
      host: "0.0.0.0",
      headers: {
        // COEP credentialless: allows cross-origin images (Google Photos etc.)
        // while keeping the page cross-origin isolated for future API needs.
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "credentialless",
      },
    },
    plugins: [tailwindcss(), react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
