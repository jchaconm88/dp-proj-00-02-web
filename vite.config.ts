import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const CHROME_DEVTOOLS_WELL_KNOWN = "/.well-known/appspecific/com.chrome.devtools.json";

export default defineConfig({
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
});
