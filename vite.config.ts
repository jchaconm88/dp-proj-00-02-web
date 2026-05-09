import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const CHROME_DEVTOOLS_WELL_KNOWN = "/.well-known/appspecific/com.chrome.devtools.json";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // En dev, si no se configura explícitamente, por defecto proxyeamos a backend local (:3001).
  // Esto evita CORS y asegura que `/web-backend/*` funcione out-of-the-box.
  const proxyTarget =
    String(env.VITE_WEB_BACKEND_PROXY_TARGET ?? "").trim().replace(/\/$/, "") ||
    (mode === "development" ? "http://localhost:3001" : "");

  return {
    server: {
      proxy: proxyTarget
        ? {
            "/web-backend": {
              target: proxyTarget,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/web-backend/, "/web"),
            },
          }
        : undefined,
    },
    plugins: [
      tailwindcss(),
      reactRouter(),
      tsconfigPaths(),
      {
        name: "chrome-devtools-well-known",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === CHROME_DEVTOOLS_WELL_KNOWN) {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end("{}");
              return;
            }
            next();
          });
        },
      },
    ],
    ssr: {
      noExternal: ["primereact", "primeicons"],
    },
  };
});
