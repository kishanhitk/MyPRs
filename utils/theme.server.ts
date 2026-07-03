import { cookies } from "next/headers";

export const themeCookieName = "en_theme";
export type Theme = "light" | "dark";

/**
 * Reads the user's explicit theme preference from the cookie.
 * Returns null when unset (meaning "follow system").
 */
export function getTheme(): Theme | null {
  const value = cookies().get(themeCookieName)?.value;
  if (value === "light" || value === "dark") return value;
  return null;
}
