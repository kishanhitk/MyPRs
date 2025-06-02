import { redirect } from "react-router";
import { type ActionFunctionArgs } from "react-router";
import { createServerClient } from "@supabase/auth-helpers-remix";

export const action = async ({ request }: ActionFunctionArgs) => {
  const response = new Response();
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { request, response }
  );

  const formData = await request.formData();
  const username = formData.get("username") as string;
  const featured = formData.get("featured") === "true";

  const { error } = await supabase
    .from("users")
    .update({ featured: !featured })
    .eq("username", username);

  if (error) {
    return { error: error.message };
  }

  return redirect(`/${username}`);
};
