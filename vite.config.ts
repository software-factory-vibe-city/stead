import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (
            id.includes("node_modules") &&
            /recharts|d3-|victory-vendor|react-smooth|decimal.js|@reduxjs|react-redux|reselect|redux/.test(
              id,
            )
          )
            return "charts";
        },
      },
    },
  },
});
