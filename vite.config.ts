// @lovable.dev/vite-tanstack-config already includes tanstackStart, viteReact, tailwindcss,
// tsConfigPaths, nitro (cloudflare default), componentTagger (dev), env injection, etc.
// Para build estático Netlify Drop, rode com:  NITRO_PRESET=netlify-static npm run build:static
// (ou apenas npm run build:static — o script já injeta a env).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: {
      entry: "server",
      // Permite trocar o preset do nitro via env (cloudflare por padrão no preview Lovable;
      // netlify-static no build do Netlify Drop).
      preset: process.env.NITRO_PRESET as never,
    },
  },
});
