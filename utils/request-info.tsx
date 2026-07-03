"use client";

import * as React from "react";
import { invariant } from "./misc";

export interface RequestInfo {
  hints: {
    theme: "light" | "dark";
    timeZone: string;
  };
  userPrefs: {
    theme: "light" | "dark" | null;
  };
}

const RequestInfoContext = React.createContext<RequestInfo | null>(null);

/**
 * Broadcasts server-derived request info (client hints + user prefs) to the
 * client tree. Replaces Remix's `useRouteLoaderData("root")` plumbing.
 */
export function RequestInfoProvider({
  value,
  children,
}: {
  value: RequestInfo;
  children: React.ReactNode;
}) {
  return (
    <RequestInfoContext.Provider value={value}>
      {children}
    </RequestInfoContext.Provider>
  );
}

export function useRequestInfo() {
  const data = React.useContext(RequestInfoContext);
  invariant(data, "No requestInfo found in RequestInfoProvider");
  return data;
}
