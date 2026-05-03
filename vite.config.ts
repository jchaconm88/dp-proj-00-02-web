import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const CHROME_DEVTOOLS_WELL_KNOWN = "/.well-known/appspecific/com.chrome.devtools.json";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = String(env.VITE_WEB_BACKEND_PROXY_TARGET ?? "").trim().replace(/\/$/, "");

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
