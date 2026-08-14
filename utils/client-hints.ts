/**
 * Utilities for client hints — user preferences the server needs but only the
 * browser knows (color scheme, time zone). Pure module: safe to import from
 * both Server Components and Client Components.
 */

export const clientHints = {
  theme: {
    cookieName: "CH-prefers-color-scheme",
    getValueCode: `window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'`,
    fallback: "light",
    transform(value: string) {
      return value === "dark" ? "dark" : "light";
    },
  },
  timeZone: {
    cookieName: "CH-time-zone",
    getValueCode: `Intl.DateTimeFormat().resolvedOptions().timeZone`,
    fallback: "UTC",
  },
  // add other hints here
};

type ClientHintNames = keyof typeof clientHints;

function getCookieValue(cookieString: string, name: ClientHintNames) {
  const hint = clientHints[name];

  const value = cookieString
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${hint.cookieName}=`))
    ?.split("=")[1];

  return value ? decodeURIComponent(value) : null;
}

/**
 * @param cookieString - the raw cookie header/string. On the server, pass
 *   `cookies().toString()` from `next/headers`. On the client, omit it and
 *   `document.cookie` is used.
 * @returns an object with the client hints and their values
 */
export function getHints(cookieString?: string) {
  let cookies = cookieString ?? "";
  if (!cookieString && typeof document !== "undefined") {
    cookies = document.cookie;
  }

  return Object.entries(clientHints).reduce(
    (acc, [name, hint]) => {
      const hintName = name as ClientHintNames;
      if ("transform" in hint) {
        acc[hintName] = hint.transform(
          getCookieValue(cookies, hintName) ?? hint.fallback
        );
      } else {
        // @ts-expect-error - this is fine (PRs welcome though)
        acc[hintName] = getCookieValue(cookies, hintName) ?? hint.fallback;
      }
      return acc;
    },
    {} as {
      [name in ClientHintNames]: (typeof clientHints)[name] extends {
        transform: (value: any) => infer ReturnValue;
      }
        ? ReturnValue
        : (typeof clientHints)[name]["fallback"];
    }
  );
}
