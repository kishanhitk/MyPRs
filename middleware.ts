import { type NextRequest } from "next/server";
import { updateSession } from "~/lib/supabase/middleware";

// NOTE: Next 16 deprecates `middleware.ts` in favor of `proxy.ts`, but `proxy`
// always runs on the Node.js runtime, which OpenNext Cloudflare does not yet
// support (opennextjs/opennextjs-cloudflare#962). Edge `middleware.ts` still
// works in Next 16 and is the OpenNext-supported path — keep it until the Node
// proxy is supported by the adapter.
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and images so every navigable
     * request gets its Supabase session refreshed.
     */
    "/((?!_next/static|_next/image|favicon.ico|assets|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|webmanifest|ttf)$).*)",
  ],
};
