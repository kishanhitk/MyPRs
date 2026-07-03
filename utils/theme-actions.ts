"use server";

import { cookies } from "next/headers";
import { themeCookieName } from "./theme.server";

export type ThemeMode = "system" | "light" | "dark";

/**
 * Persists the theme preference in a cookie. "system" clears the cookie so the
 * app falls back to the OS preference (via client hints).
 */
export async function setThemeAction(theme: ThemeMode) {
  const store = cookies();
  if (theme === "system") {
    store.set(themeCookieName, "", { path: "/", maxAge: 0 });
  } else {
    store.set(themeCookieName, theme, { path: "/" });
  }
}
