import { resolve } from "node:path";
import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig } from "vite";
import { vercelPreset } from "@vercel/remix/vite";

installGlobals();

export default defineConfig({
  plugins: [
    remix({
      presets: [vercelPreset()],
      ignoredRouteFiles: ["**/*.css"],
    }),
  ],
  resolve: {
    alias: [
      {
        find: "~",
        replacement: resolve("app"),
      },
    ],
  },
});
