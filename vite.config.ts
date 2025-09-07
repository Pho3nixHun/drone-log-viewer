import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/drone-log-viewer/",
  resolve: {
    alias: {
      "@": "/src",
      "@/components": "/src/components",
      "@/stores": "/src/stores",
      "@/utils": "/src/utils",
      "@/types": "/src/types",
      "@/i18n": "/src/i18n",
    },
  },
});
