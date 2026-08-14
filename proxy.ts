import { type NextRequest } from "next/server";
import { updateSession } from "~/lib/supabase/middleware";

// Next 16's `proxy` convention (Node.js runtime) replacing the deprecated
// `middleware`. Refreshes the Supabase session on every navigable request.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and images so every navigable
     * request gets its Supabase session refreshed.
     */
    "/((?!_next/static|_next/image|favicon.ico|assets|api/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|webmanifest|ttf)$).*)",
  ],
};
