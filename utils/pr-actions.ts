"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "~/lib/supabase/server";

/**
 * Toggle a PR's "featured" status for the signed-in owner.
 * Re-auth is enforced server-side; UI gating is not trusted.
 */
export async function toggleFeaturedAction(input: {
  prId: string;
  featuredGithubPRs: string[];
  isFeatured: boolean;
  username: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in to do that" };

  const updated = input.isFeatured
    ? input.featuredGithubPRs.filter((id) => id !== input.prId)
    : [...input.featuredGithubPRs, input.prId];

  const { error } = await supabase
    .from("users")
    .update({ featured_github_prs: updated })
    .eq("id", user.id);
  if (error) console.error(error);

  revalidatePath(`/${input.username}`);
  return { error: error?.message ?? null };
}

/**
 * Persist the owner's excluded repositories.
 */
export async function saveExcludedReposAction(input: {
  reposToExclude: string[];
  username: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in to do that" };

  const { error } = await supabase
    .from("users")
    .update({ excluded_github_repos: input.reposToExclude })
    .eq("id", user.id);
  if (error) console.error(error);

  revalidatePath(`/${input.username}`);
  return { error: error?.message ?? null };
}
