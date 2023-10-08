import { createCookieSessionStorage } from "@vercel/remix";
import { Theme, isTheme } from "./theme-provider";

const themeStorage = createCookieSessionStorage({
  cookie: {
    name: "KCD_theme",
    secure: true,
    secrets: [process.env.SESSION_SECRET!],
    sameSite: "lax",
    path: "/",
    httpOnly: true,
  },
});

async function getThemeSession(request: Request) {
  const session = await themeStorage.getSession(request.headers.get("Cookie"));
  return {
    getTheme: () => {
      const themeValue = session.get("theme");
      return isTheme(themeValue) ? themeValue : Theme.DARK;
    },
    setTheme: (theme: Theme) => session.set("theme", theme),
    commit: () =>
      themeStorage.commitSession(session, { expires: new Date("2088-10-18") }),
  };
}

export { getThemeSession };
