import type { LoaderFunctionArgs } from "@remix-run/node";
export const config = { runtime: "edge" };

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const city = request.headers.get("x-vercel-ip-city");
  return { hello: "world", city: city };
};
