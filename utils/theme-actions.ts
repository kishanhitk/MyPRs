"use server";

import { cookies } from "next/headers";
import { themeCookieName } from "./theme.server";

export type ThemeMode = "system" | "light" | "dark";

/**
 * Persists the theme preference in a cookie. "system" clears the cookie so the
 * app falls back to the OS preference (via client hints).
 */
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setThemeAction(theme: ThemeMode) {
  const store = await cookies();
  if (theme === "system") {
    store.set(themeCookieName, "", { path: "/", maxAge: 0 });
  } else {
    // Persist across browser restarts, not just the session.
    store.set(themeCookieName, theme, { path: "/", maxAge: ONE_YEAR });
  }
}
