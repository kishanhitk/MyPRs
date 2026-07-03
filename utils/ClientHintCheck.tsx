"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { clientHints } from "./client-hints";

/**
 * Inline script that checks client hints against their cookies on first paint
 * and, if any is stale, writes the correct value and reloads — so the server
 * renders the right theme with no flash. Also refreshes on OS theme change.
 */
export function ClientHintCheck() {
  const router = useRouter();
  React.useEffect(() => {
    const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    function handleThemeChange() {
      document.cookie = `${clientHints.theme.cookieName}=${
        themeQuery.matches ? "dark" : "light"
      }; Max-Age=31536000; Path=/`;
      router.refresh();
    }
    themeQuery.addEventListener("change", handleThemeChange);
    return () => {
      themeQuery.removeEventListener("change", handleThemeChange);
    };
  }, [router]);

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
const cookies = document.cookie.split(';').map(c => c.trim()).reduce((acc, cur) => {
	const [key, value] = cur.split('=');
	acc[key] = value;
	return acc;
}, {});
let cookieChanged = false;
const hints = [
${Object.values(clientHints)
  .map((hint) => {
    const cookieName = JSON.stringify(hint.cookieName);
    return `{ name: ${cookieName}, actual: String(${hint.getValueCode}), cookie: cookies[${cookieName}] }`;
  })
  .join(",\n")}
];
for (const hint of hints) {
	if (decodeURIComponent(hint.cookie) !== hint.actual) {
		cookieChanged = true;
    document.cookie = encodeURIComponent(hint.name) + '=' + encodeURIComponent(hint.actual) + '; Max-Age=31536000; path=/';
	}
}
if (cookieChanged && navigator.cookieEnabled) {
	window.location.reload();
}
			`,
      }}
    />
  );
}
