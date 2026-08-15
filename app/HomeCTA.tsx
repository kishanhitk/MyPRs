"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSession } from "~/app/providers";
import { Button } from "~/components/ui/button";
import { LoginCTA } from "./LoginCTA";

// The static shell shows the login CTA (the majority case); a resolved
// session swaps in "Continue as" client-side.
export default function HomeCTA() {
  const session = useSession();
  const userName = session?.user?.user_metadata?.user_name as
    | string
    | undefined;
  const avatarUrl = session?.user?.user_metadata?.avatar_url as
    | string
    | undefined;

  if (!userName) return <LoginCTA />;

  return (
    <Button asChild>
      <Link href={`/${userName}`} prefetch>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          className="mr-2 h-6 w-6 rounded-full"
          alt={userName}
        />
        Continue as {userName}
        <ArrowRight aria-hidden className="ml-1.5 size-4" />
      </Link>
    </Button>
  );
}
