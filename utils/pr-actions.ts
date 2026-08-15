"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "~/lib/supabase/server";

// featured_github_prs stores canonical PR URLs — the only identifier the
// REST and GraphQL search engines agree on (their numeric ids differ).
const PR_URL = /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+$/;

export async function toggleFeaturedAction(input: {
  prUrl: string;
  username: string;
}) {
  if (!PR_URL.test(input.prUrl)) return { error: "Invalid PR" };
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
  const updated = current.includes(input.prUrl)
    ? current.filter((url) => url !== input.prUrl)
    : [...current, input.prUrl];

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
  orderedUrls: string[];
}) {
  if (!input.orderedUrls.every((url) => PR_URL.test(url))) {
    return { error: "Invalid PR" };
  }
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

  // The client reorders only the featured PRs it can render; ids orphaned
  // by repo filters or dropped GitHub results never reach it. Validate the
  // input as a subset and keep the orphans at the tail so they stay
  // featured if their repo is un-excluded later.
  const current: string[] = row?.featured_github_prs ?? [];
  const currentSet = new Set(current);
  const orderedSet = new Set(input.orderedUrls);
  const valid =
    orderedSet.size === input.orderedUrls.length &&
    input.orderedUrls.every((url) => currentSet.has(url));
  if (!valid) {
    return { error: "Order is out of date — refresh and try again" };
  }

  const next = [
    ...input.orderedUrls,
    ...current.filter((url) => !orderedSet.has(url)),
  ];
  const { error } = await supabase
    .from("users")
    .update({ featured_github_prs: next })
    .eq("id", user.id);

  revalidatePath(`/${input.username}`);
  return { error: error?.message ?? null };
}
