"use client";

import * as React from "react";
import posthog from "posthog-js";

/** Fire-once analytics beacon for server-rendered states (errors, empties). */
export default function TrackEvent({
  name,
  props,
}: {
  name: string;
  props?: Record<string, string | number | boolean>;
}) {
  const sent = React.useRef(false);
  React.useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    posthog.capture(name, props);
  }, [name, props]);
  return null;
}
