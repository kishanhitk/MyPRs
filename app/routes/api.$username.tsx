import { type LoaderFunctionArgs } from "react-router";
import { createServerClient } from "@supabase/auth-helpers-remix";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const response = new Response();
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { request, response }
  );

  const username = params.username;
  if (!username) {
    throw new Response("Username is required", { status: 400 });
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .single();

  if (userError) {
    throw new Response("User not found", { status: 404 });
  }

  return { user: userData };
};
