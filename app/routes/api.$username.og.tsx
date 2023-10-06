import type { LoaderFunctionArgs } from "@remix-run/node";
import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const username = params.username!;
  const url = new URL(request.url);
  const domain = url.origin;
  const avatar = url.searchParams.get("avatar");

  const interSemiBold = await fetch(`${domain}/assets/inter-semibold.ttf`).then(
    (res) => res.arrayBuffer()
  );
  const interRegular = await fetch(`${domain}/assets/inter-regular.ttf`).then(
    (res) => res.arrayBuffer()
  );

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 40,
          color: "black",
          background: "#fdfafa",
          width: "100%",
          height: "100%",
          padding: "50px 200px",
          textAlign: "center",
          justifyContent: "center",
          alignItems: "center",
          display: "flex",
        }}
      >
        <div
          style={{
            display: "flex",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
              width: "500px",
            }}
          >
            <p
              style={{
                fontSize: "55px",
                fontWeight: "600",
                textAlign: "left",
                marginBottom: "-20px",
                lineHeight: "1.1",
              }}
            >
              One link to highlight your Open-Source Contributions.
            </p>
            <p
              style={{
                fontSize: "27px",
                textAlign: "left",
                color: "rgb(71, 85, 105)",
                fontWeight: "400",
              }}
            >
              The 'link-in-bio' for your Open-Source PRs. Curate a selection of
              your proudest GitHub PRs, showcase your expertise, and set
              yourself apart in the crowd.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              marginRight: "50px",
              width: "500px",
            }}
          >
            <img
              style={{
                borderRadius: "100%",
                height: "400px",
                width: "400px",
              }}
              alt="User"
              src={
                avatar ?? "https://avatars.githubusercontent.com/u/41117038?v=4"
              }
            />
            <p
              style={{
                fontSize: "50px",
                fontWeight: "600",
              }}
            >
              {username}
            </p>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Inter",
          data: interSemiBold,
          weight: 600,
        },
        {
          name: "Inter",
          data: interRegular,
          weight: 400,
        },
      ],
    }
  );
};
