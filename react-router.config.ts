import { vercelPreset } from "@vercel/react-router/vite";

export default {
  ssr: true,
  prerender: ["/"],
  presets: [vercelPreset()],
};
