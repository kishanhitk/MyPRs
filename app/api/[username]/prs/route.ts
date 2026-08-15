import { NextResponse } from "next/server";
import { searchMergedPRs } from "~/lib/github";

// Deeper history pages for the profile's infinite scroll. The underlying
// GraphQL page is server-cached for an hour; the CDN caches the JSON too,
// so a hot profile costs GitHub nothing as visitors scroll.
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(username)) {
    return NextResponse.json({ error: "invalid username" }, { status: 400 });
  }
  const cursor = new URL(request.url).searchParams.get("cursor");

  const page = await searchMergedPRs(username, cursor);
  if (page.error) {
    return NextResponse.json(
      { error: "unavailable", reason: page.reason ?? "error" },
      { status: page.reason === "rate_limited" ? 429 : 502 }
    );
  }

  return NextResponse.json(
    { items: page.items, endCursor: page.endCursor, hasNext: page.hasNext },
    {
      headers: {
        "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
