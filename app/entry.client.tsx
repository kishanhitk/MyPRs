import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router";

// fixup stuff before hydration
function hydrate() {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>
    );
  });
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (window.requestIdleCallback) {
  window.requestIdleCallback(hydrate);
} else {
  window.setTimeout(hydrate, 1);
}
