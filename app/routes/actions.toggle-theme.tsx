import { type ActionFunctionArgs, redirect } from "react-router";
import { getTheme, setTheme } from "~/utils/theme.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const requestUrl = new URL(request.url);
  const formData = await request.formData();
  
  const theme = formData.get("theme");
  
  if (!theme) {
    return { success: false };
  }

  return redirect(requestUrl.pathname, {
    headers: { "Set-Cookie": setTheme(theme === "light" ? "light" : "dark") },
  });
};
