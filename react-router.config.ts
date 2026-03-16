import type { Config } from "@react-router/dev/config";

export default {
  // SPA mode: la app usa Firebase Auth (100% client-side), por lo que SSR
  // causaba mismatches de hidratación con localStorage (tema). En SPA mode
  // todo se renderiza en el cliente y localStorage está siempre disponible.
  ssr: false,
} satisfies Config;
