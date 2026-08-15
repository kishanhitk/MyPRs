import { NextResponse } from "next/server";
import { searchMergedPRs } from "~/lib/github";

// Temporary: measures whether use-cache entries persist across invocations.
export async function GET() {
  const t0 = Date.now();
  const page = await searchMergedPRs("kishanhitk");
  return NextResponse.json(
    { ms: Date.now() - t0, items: page.items.length },
    { headers: { "cache-control": "no-store" } }
  );
}
