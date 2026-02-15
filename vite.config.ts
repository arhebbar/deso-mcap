import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/cryptocompare": {
        target: "https://min-api.cryptocompare.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cryptocompare/, ""),
      },
      "/deso-api": {
        target: "https://node.deso.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/deso-api/, "/api/v0"),
      },
      "/deso-hodlers": {
        target: "https://blockproducer.deso.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/deso-hodlers/, "/api/v0"),
      },
      "/deso-graphql": {
        target: "https://graphql-prod.deso.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/deso-graphql/, "/graphql"),
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
