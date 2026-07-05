import { cookies } from "next/headers";

export const themeCookieName = "en_theme";
export type Theme = "light" | "dark";

/**
 * Reads the user's explicit theme preference from the cookie.
 * Returns null when unset (meaning "follow system").
 */
export async function getTheme(): Promise<Theme | null> {
  const store = await cookies();
  const value = store.get(themeCookieName)?.value;
  if (value === "light" || value === "dark") return value;
  return null;
}
