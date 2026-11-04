import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-ignore - JavaScript ES module handler
import { handleApiRequest } from "./server/apiHandler.mjs";

export default defineConfig(({ mode }) => ({
  base: mode === "pages" ? "/Algo-Triggers-demo/" : "/",
  define: { __DEMO_ONLY__: JSON.stringify(mode === "pages") },
  plugins: [
    react(),
    {
      name: "yahoo-finance-api-middleware",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const rawUrl = (req as { url?: string }).url;
          if (rawUrl && rawUrl.startsWith("/api/")) {
            try {
              const handled = await handleApiRequest(req, res);
              if (handled) return;
            } catch (err) {
              console.error("[Vite API Error]:", err);
            }
          }
          next();
        });
      },
    },
  ],
  server: { port: 5173, strictPort: true },
}));
