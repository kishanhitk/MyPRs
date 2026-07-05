import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "github.com" },
      { protocol: "https", hostname: "ghchart.rshah.org" },
    ],
  },
};

export default nextConfig;

// Lets `next dev` talk to the OpenNext Cloudflare bindings (dev only).
initOpenNextCloudflareForDev();
