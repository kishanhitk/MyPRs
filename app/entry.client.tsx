import { HydratedRouter } from "react-router/dom";
import * as React from "react";
import { hydrateRoot } from "react-dom/client";

// fixup stuff before hydration
function hydrate() {
  React.startTransition(() => {
    hydrateRoot(document, <HydratedRouter />);
  });
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (window.requestIdleCallback) {
  window.requestIdleCallback(hydrate);
} else {
  window.setTimeout(hydrate, 1);
}
