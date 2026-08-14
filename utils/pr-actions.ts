"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "~/lib/supabase/server";

export async function toggleFeaturedAction(input: {
  prId: string;
  username: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in to do that" };

  // Read the current list from the DB (not a client-supplied snapshot) so
  // concurrent toggles from multiple tabs don't clobber each other.
  const { data: row, error: readError } = await supabase
    .from("users")
    .select("featured_github_prs")
    .eq("id", user.id)
    .single();
  if (readError) {
    console.error(readError);
    return { error: readError.message };
  }

  const current: string[] = row?.featured_github_prs ?? [];
  const updated = current.includes(input.prId)
    ? current.filter((id) => id !== input.prId)
    : [...current, input.prId];

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

/**
 * Persist the owner's featured-PR order. The submitted list must be a
 * permutation of the current one, so a stale tab can't clobber a toggle
 * that happened elsewhere.
 */
export async function reorderFeaturedAction(input: {
  username: string;
  orderedIds: string[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in to do that" };

  const { data: row, error: readError } = await supabase
    .from("users")
    .select("featured_github_prs")
    .eq("id", user.id)
    .single();
  if (readError) return { error: readError.message };

  const current: string[] = row?.featured_github_prs ?? [];
  const currentSet = new Set(current);
  const valid =
    input.orderedIds.length === current.length &&
    input.orderedIds.every((id) => currentSet.has(id));
  if (!valid) {
    return { error: "Order is out of date — refresh and try again" };
  }

  const { error } = await supabase
    .from("users")
    .update({ featured_github_prs: input.orderedIds })
    .eq("id", user.id);

  revalidatePath(`/${input.username}`);
  return { error: error?.message ?? null };
}
