import { ImageResponse } from "next/og";
import {
  getDeepRepoNames,
  getGitHubUserData,
  searchMergedPRs,
} from "~/lib/github";
import type { GithubUser } from "~/types/shared";

const INK = "#18181B";
const MUTED = "#71717A";
const RAIL = "#E4E4E7";
const BG = "#FAFAF9";

const PR_ICON_PATH =
  "M305.8 2.1C314.4 5.9 320 14.5 320 24V72h16c66.3 0 120 53.7 120 120V355.7c32.5 10.2 56 40.5 56 76.3c0 44.2-35.8 80-80 80s-80-35.8-80-80c0-35.8 23.5-66.1 56-76.3V192c0-39.8-32.2-72-72-72H320v48c0 9.5-5.6 18.1-14.2 21.9s-18.8 2.3-25.8-4.1l-80-72c-5.1-4.6-7.9-11-7.9-17.8s2.9-13.3 7.9-17.8l80-72c7-6.3 17.2-7.9 25.8-4.1zM112 80A32 32 0 1 0 48 80a32 32 0 1 0 64 0zm-8 76.3V355.7c32.5 10.2 56 40.5 56 76.3c0 44.2-35.8 80-80 80s-80-35.8-80-80c0-35.8 23.5-66.1 56-76.3V156.3C23.5 146.1 0 115.8 0 80C0 35.8 35.8 0 80 0s80 35.8 80 80c0 35.8-23.5 66.1-56 76.3zM112 432a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm320 32a32 32 0 1 0 0-64 32 32 0 1 0 0 64z";

export const maxDuration = 60;

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

  // Font files ride the same 1h data cache as the PR history; after one
  // profile render this whole route serves from cache.
  const [geistSemiBold, geistMono, prs, user] = await Promise.all([
    fetch(`${domain}/assets/Geist-SemiBold.ttf`, { cache: "force-cache" }).then(
      (r) => r.arrayBuffer()
    ),
    fetch(`${domain}/assets/GeistMono-Regular.ttf`, {
      cache: "force-cache",
    }).then((r) => r.arrayBuffer()),
    // One batched GraphQL request: page 1, total, and the since-year probe.
    searchMergedPRs(username),
    getGitHubUserData(username),
  ]);

  // Never bake a transient failure into a cached social card.
  const searchFailed = Boolean(prs.error);
  const total = prs.totalCount;
  const page1Repos = [...new Set(prs.items.map((i) => i.repo))];
  const deep = prs.hasNext ? await getDeepRepoNames(username, total) : [];
  const repoCount = deep
    ? new Set([...page1Repos, ...deep]).size
    : page1Repos.length;
  // Exact unless the breakdown failed or the 1000-result cap hides history.
  const repos =
    (deep === null || total > 1000) && repoCount
      ? `${repoCount}+`
      : String(repoCount);
  const since = prs.sinceYear;
  const name = (user.data as GithubUser | null)?.name ?? username;

  // Satori needs single text children.
  const handleLine = `@${username}`;
  const urlLine = `myprs.dev/${username}`;

  const stats: Array<[string, string]> = searchFailed
    ? []
    : [
        [String(total), "merged PRs"],
        ...(repoCount ? [[repos, "repositories"] as [string, string]] : []),
        ...(since ? [[String(since), "since"] as [string, string]] : []),
      ];

  const statBlock = ([value, label]: [string, string]) => (
    <div
      key={label}
      style={{ display: "flex", flexDirection: "column" }}
    >
      <div
        style={{
          fontFamily: "Geist",
          fontSize: 100,
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: "-2px",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "Geist Mono",
          fontSize: 23,
          color: MUTED,
          marginTop: 14,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
        }}
      >
        {label}
      </div>
    </div>
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
          padding: "72px 80px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatar}
                width={160}
                height={160}
                alt=""
                style={{
                  borderRadius: 80,
                  border: `3px solid ${RAIL}`,
                }}
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    fontFamily: "Geist",
                    fontSize: 78,
                    fontWeight: 600,
                    lineHeight: 1.05,
                    letterSpacing: "-1.5px",
                  }}
                >
                  {handleLine}
                </div>
                <div
                  style={{
                    fontFamily: "Geist Mono",
                    fontSize: 28,
                    color: MUTED,
                    marginTop: 12,
                  }}
                >
                  {name}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 72, paddingRight: 24 }}>
              {stats.map(statBlock)}
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
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
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
              <svg width={24} height={24} viewBox="0 0 512 512">
                <path d={PR_ICON_PATH} fill={MUTED} />
              </svg>
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
      headers: {
        "Cache-Control": searchFailed
          ? "no-store"
          : "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
