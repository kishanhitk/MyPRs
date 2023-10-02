import { StarIcon, GitPullRequest, SmileIcon } from "lucide-react";
import { Button } from "../ui/button";
import type { GitHubIssue } from "~/types/shared";
import { useFetcher, useLoaderData } from "@remix-run/react";
import type { loader } from "~/routes/$username";
import { ChatBubbleIcon, OpenInNewWindowIcon } from "@radix-ui/react-icons";
import { motion } from "framer-motion";

interface IGithubCardProps {
  item: GitHubIssue;
  isFeatured?: boolean;
  isOwner?: boolean;
}

export function DemoGithub({
  item,
  isFeatured = false,
  isOwner = false,
}: IGithubCardProps) {
  const { featured_github_prs } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const toggleFeatured = async (prId: number) => {
    fetcher.submit(
      { prId, featured_github_prs, isFeatured },
      { method: "post", action: "/actions/toggle-featured" }
    );
  };

  return (
    <motion.div
      initial={{ y: -300, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 300, opacity: 0 }}
      className="my-3 border p-4 rounded-md border-slate-300 bg-slate-50"
    >
      <div className="space-y-3">
        <div className="flex">
          <h3 className="text-sm text-slate-700 mr-auto">
            {item.repository_url.slice(29)}
          </h3>

          {isOwner ? (
            <Button
              asChild
              size="icon"
              disabled={
                fetcher.state === "submitting" || fetcher.state === "loading"
              }
              onClick={async () => {
                toggleFeatured(item.id);
              }}
              variant="ghost"
            >
              <StarIcon
                onClick={async () => {
                  toggleFeatured(item.id);
                }}
                fill={isFeatured ? "currentColor" : "none"}
                className="h-5 w-5"
              />
            </Button>
          ) : null}
          <a
            href={item.html_url}
            className="ml-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            <OpenInNewWindowIcon className="h-5 w-5" />
          </a>
        </div>
        <div className="flex">
          <GitPullRequest className="text-github_merged inline mr-2" />
          <a
            href={item.html_url}
            className="ml-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            <p className="font-medium">{item.title}</p>
          </a>
        </div>
      </div>

      <div className="flex text-sm text-muted-foreground mt-4">
        <div className="flex items-center">
          <SmileIcon className="mr-1 h-4 w-4" />
          {item.reactions.total_count}
        </div>
        <div className="flex items-center ml-4">
          <ChatBubbleIcon className="mr-1 h-4 w-4" />
          {item.comments}
        </div>
        <div className="ml-auto">
          Merged on:{" "}
          {new Date(item.pull_request.merged_at).toDateString().slice(4)}
        </div>
      </div>
    </motion.div>
  );
}
