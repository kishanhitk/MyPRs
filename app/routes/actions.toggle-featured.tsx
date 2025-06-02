import { createClient } from "@supabase/supabase-js";
import type { Env } from "~/types/shared";
import { z } from "zod";
import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = process.env as Env;
  const supabaseClient = createClient(
    env.SUPABASE_URL!,
    env.SUPABASE_ANON_KEY!
  );
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) {
    return data({ error: "You must be logged in to do that" }, { status: 401 });
  }
  const body = await request.formData();
  const pr_id = z.string().parse(body.get("prId"));
  const featuredGithubPRs = z.string().parse(body.get("featured_github_prs"));
  const isFeatured = body.get("isFeatured");

  const updatedFeaturedGithubPRs =
    isFeatured === "true"
      ? featuredGithubPRs.split(",").filter((id) => id !== pr_id)
      : [...(featuredGithubPRs ? featuredGithubPRs.split(",") : []), pr_id];

  const { data: updateData, error } = await supabaseClient
    .from("users")
    .update({
      featured_github_prs: updatedFeaturedGithubPRs,
    })
    .eq("id", user.id);
  if (error) console.error(error);

  return data({ data: updateData, error });
}
