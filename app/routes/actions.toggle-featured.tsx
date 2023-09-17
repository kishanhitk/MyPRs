import type { ActionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createServerClient } from "@supabase/auth-helpers-remix";
import type { Env } from "~/types/shared";
import { z } from "zod";

export async function action({ request, context }: ActionArgs) {
  const response = new Response();
  const env = context.env as Env;
  const supabaseClient = createServerClient(
    env.SUPABASE_URL!,
    env.SUPABASE_ANON_KEY!,
    { request, response }
  );
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) {
    return json({ error: "You must be logged in to do that" }, { status: 401 });
  }
  const body = await request.formData();
  const pr_id = z.string().parse(body.get("prId"));
  const featuredGithubPRs = z.string().parse(body.get("featured_github_prs"));
  const isFeatured = body.get("isFeatured");

  const updatedFeaturedGithubPRs =
    isFeatured === "true"
      ? featuredGithubPRs.split(",").filter((id) => id !== pr_id)
      : [...(featuredGithubPRs ? featuredGithubPRs.split(",") : []), pr_id];

  const { data, error } = await supabaseClient
    .from("users")
    .update({
      featured_github_prs: updatedFeaturedGithubPRs,
    })
    .eq("id", user.id);
  if (error) console.error(error);

  return json({ data, error });
}
