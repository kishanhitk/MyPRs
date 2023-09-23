import type { LoaderFunctionArgs } from "@vercel/remix";
import { json } from "@vercel/remix";

export const loader = async ({
  request,
  context,
  params,
}: LoaderFunctionArgs) => {
  const time = new Date().getTime();
  const resp = await fetch(
    "https://api.github.com/search/issues?q=created:2021-09-16T08:39:14.342Z..2023-09-16T08:39:14.342Z+type:pr+is:public+author:kishanhitk+is:merged&per_page=100"
  );
  const data = await resp.json();
  const timeEnd = new Date().getTime();

  const duration = timeEnd - time;
  return json(
    { hello: "world", duration, data },
    {
      headers: {
        "Cache-Control":
          "public, max-age=10, s-max-age=20, stale-while-revalidate=30",
      },
    }
  );
};
