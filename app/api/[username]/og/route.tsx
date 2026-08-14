import { ImageResponse } from "next/og";
import { getAllMergedPRs, getGitHubUserData } from "~/lib/github";
import type { GithubUser } from "~/types/shared";

const INK = "#18181B";
const MUTED = "#71717A";
const RAIL = "#E4E4E7";
const BG = "#FAFAF9";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const url = new URL(request.url);
  const domain = url.origin;
  const avatar =
    url.searchParams.get("avatar") ??
    `https://github.com/${username}.png?size=200`;
  const featuredPRsCount = Number(
    url.searchParams.get("featuredPRsCount") ?? 0
  );

  // Font files ride the same 1h data cache as the PR history; after one
  // profile render this whole route serves from cache.
  const [geistSemiBold, geistMono, prs, user] = await Promise.all([
    fetch(`${domain}/assets/Geist-SemiBold.ttf`).then((r) => r.arrayBuffer()),
    fetch(`${domain}/assets/GeistMono-Regular.ttf`).then((r) =>
      r.arrayBuffer()
    ),
    getAllMergedPRs(username),
    getGitHubUserData(username),
  ]);

  const items = prs.data?.items ?? [];
  const total = prs.data?.total_count ?? 0;
  const repos = new Set(
    items.map((i) => i.repository_url.slice(29))
  ).size;
  const since = items.length
    ? Math.min(
        ...items.map((i) =>
          new Date(i.pull_request.merged_at).getFullYear()
        )
      )
    : null;
  const name = (user.data as GithubUser | null)?.name ?? username;

  const statLine = [
    `${total} merged pull requests`,
    repos ? `${repos} repositories` : null,
    since ? `since ${since}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
  // Satori needs single text children, and Geist Mono has no ★ glyph.
  const handleLine =
    `@${username}` +
    (featuredPRsCount > 0 ? `  ·  ${featuredPRsCount} featured` : "");
  const urlLine = `myprs.dev/${username}`;

  const node = (filled: boolean, top: number) => (
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: -9,
        top,
        width: 22,
        height: 22,
        borderRadius: 11,
        border: `4px solid ${filled ? INK : "#A1A1AA"}`,
        background: filled ? INK : BG,
      }}
    />
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: BG,
          color: INK,
          padding: "64px 72px",
        }}
      >
        {/* the trunk */}
        <div
          style={{
            display: "flex",
            position: "relative",
            width: 4,
            borderRadius: 2,
            background: RAIL,
            marginRight: 64,
          }}
        >
          {node(true, 48)}
          {node(false, 240)}
          {node(false, 400)}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatar}
              width={96}
              height={96}
              alt=""
              style={{
                borderRadius: 48,
                border: `2px solid ${RAIL}`,
              }}
            />
            <div
              style={{
                fontFamily: "Geist",
                fontSize: 60,
                fontWeight: 600,
                marginTop: 28,
                lineHeight: 1.05,
              }}
            >
              {name}
            </div>
            <div
              style={{
                fontFamily: "Geist Mono",
                fontSize: 26,
                color: MUTED,
                marginTop: 14,
              }}
            >
              {handleLine}
            </div>
            <div
              style={{
                fontFamily: "Geist Mono",
                fontSize: 28,
                color: MUTED,
                marginTop: 34,
              }}
            >
              {statLine}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <div
              style={{
                fontFamily: "Geist Mono",
                fontSize: 26,
                color: INK,
              }}
            >
              {urlLine}
            </div>
            <div
              style={{
                fontFamily: "Geist",
                fontSize: 28,
                fontWeight: 600,
                color: MUTED,
              }}
            >
              MyPRs
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Geist", data: geistSemiBold, weight: 600 },
        { name: "Geist Mono", data: geistMono, weight: 400 },
      ],
    }
  );
}
