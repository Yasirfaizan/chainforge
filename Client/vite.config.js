import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({ include: ["buffer"], globals: { Buffer: true } }),
  ],
  define: { global: "globalThis" },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          admin: [
            "src/pages/admin/AdminDashboard.jsx",
            "src/pages/admin/AdminOverview.jsx",
            "src/pages/admin/AdminUsers.jsx",
            "src/pages/admin/AdminTransactions.jsx",
            "src/pages/admin/AdminAPIKeys.jsx",
            "src/pages/admin/AdminChainStats.jsx",
            "src/pages/admin/AdminSettings.jsx",
          ],
        },
      },
    },
  },
});
