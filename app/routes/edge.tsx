import type { LoaderFunctionArgs } from "@vercel/remix";

export const config = { runtime: "edge" };

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const city = request.headers.get("x-vercel-ip-city");
  return { hello: "world", city: city };
};
