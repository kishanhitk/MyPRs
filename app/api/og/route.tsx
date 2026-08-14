import { ImageResponse } from "next/og";

const INK = "#18181B";
const MUTED = "#71717A";
const BG = "#FAFAF9";

const PR_ICON_PATH =
  "M305.8 2.1C314.4 5.9 320 14.5 320 24V72h16c66.3 0 120 53.7 120 120V355.7c32.5 10.2 56 40.5 56 76.3c0 44.2-35.8 80-80 80s-80-35.8-80-80c0-35.8 23.5-66.1 56-76.3V192c0-39.8-32.2-72-72-72H320v48c0 9.5-5.6 18.1-14.2 21.9s-18.8 2.3-25.8-4.1l-80-72c-5.1-4.6-7.9-11-7.9-17.8s2.9-13.3 7.9-17.8l80-72c7-6.3 17.2-7.9 25.8-4.1zM112 80A32 32 0 1 0 48 80a32 32 0 1 0 64 0zm-8 76.3V355.7c32.5 10.2 56 40.5 56 76.3c0 44.2-35.8 80-80 80s-80-35.8-80-80c0-35.8 23.5-66.1 56-76.3V156.3C23.5 146.1 0 115.8 0 80C0 35.8 35.8 0 80 0s80 35.8 80 80c0 35.8-23.5 66.1-56 76.3zM112 432a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm320 32a32 32 0 1 0 0-64 32 32 0 1 0 0 64z";

export async function GET(request: Request) {
  const domain = new URL(request.url).origin;
  const [geistSemiBold, geistMono] = await Promise.all([
    fetch(`${domain}/assets/Geist-SemiBold.ttf`).then((r) => r.arrayBuffer()),
    fetch(`${domain}/assets/GeistMono-Regular.ttf`).then((r) =>
      r.arrayBuffer()
    ),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          color: INK,
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* wordmark lockup */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                fontFamily: "Geist",
                fontSize: 34,
                fontWeight: 600,
              }}
            >
              MyPRs
            </div>
            <svg
              width={30}
              height={30}
              viewBox="0 0 512 512"
              style={{ marginTop: 2 }}
            >
              <path d={PR_ICON_PATH} fill={INK} />
            </svg>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: "Geist",
              fontSize: 78,
              fontWeight: 600,
              lineHeight: 1.14,
              marginTop: 56,
            }}
          >
            <div style={{ display: "flex" }}>
              <span>{"One link to "}</span>
              <span
                style={{
                  borderBottom: `6px solid ${MUTED}`,
                  paddingBottom: 2,
                }}
              >
                highlight
              </span>
            </div>
            <div style={{ display: "flex" }}>your open-source</div>
            <div style={{ display: "flex" }}>contributions.</div>
          </div>
          <div
            style={{
              fontFamily: "Geist Mono",
              fontSize: 27,
              color: MUTED,
              marginTop: 32,
            }}
          >
            The link-in-bio for your merged pull requests.
          </div>
        </div>

        <div
          style={{
            fontFamily: "Geist Mono",
            fontSize: 26,
            color: MUTED,
          }}
        >
          myprs.dev/your-github-username
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
