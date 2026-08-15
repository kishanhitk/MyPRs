"use client";

import { useSession, useVisitorPreview } from "~/app/providers";

// The static shell renders the visitor view for everyone; owner-only
// affordances mount here once the client session proves ownership.
export default function OwnerGate({
  ownerRowId,
  children,
}: {
  ownerRowId: string | undefined;
  children: React.ReactNode;
}) {
  const session = useSession();
  const { previewing } = useVisitorPreview();
  const isOwner = Boolean(
    ownerRowId && session?.user?.id && session.user.id === ownerRowId
  );
  return isOwner && !previewing ? <>{children}</> : null;
}
