import { defineConfig } from "vite";
import reactRefresh from "@vitejs/plugin-react";
import svgrPlugin from "vite-plugin-svgr";

// to be used if cannot work without process.env
// import envCompatible from "vite-plugin-env-compatible";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: "build",
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  plugins: [
    reactRefresh(),
    svgrPlugin({
      svgrOptions: {
        icon: "1.5rem",
        // default width and height

        // ...svgr options (https://react-svgr.com/docs/options/)
      },
    }),
  ],
});