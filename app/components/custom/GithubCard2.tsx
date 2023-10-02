import { StarIcon, GitPullRequest, SmileIcon } from "lucide-react";
import { Button } from "../ui/button";
import type { GitHubIssue } from "~/types/shared";
import { useFetcher, useLoaderData } from "@remix-run/react";
import type { loader } from "~/routes/$username";
import { ChatBubbleIcon, OpenInNewWindowIcon } from "@radix-ui/react-icons";
import toast from "react-hot-toast";
import { useEffect } from "react";

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
  const fetcherState = fetcher.state;

  const toggleFeatured = async (prId: number) => {
    fetcher.submit(
      { prId, featured_github_prs, isFeatured },
      { method: "post", action: "/actions/toggle-featured" }
    );
  };

  useEffect(() => {
    // let toastId;
    if (fetcherState === "submitting") {
      // toastId = toast.loading("Updating...");
    } else {
      if (fetcherState !== "idle" && fetcher.data) {
        // toast.dismiss(toastId);
        toast.success("Submitted!");
      }
    }
  }, [fetcher.data, fetcherState]);

  return (
    <div className="my-3 border p-4 rounded-md border-slate-300 bg-slate-50">
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
          <a href={item.html_url} className="ml-2">
            <OpenInNewWindowIcon className="h-5 w-5" />
          </a>
        </div>
        <div className="flex">
          <GitPullRequest className="text-github_merged inline mr-2" />
          <p className="font-medium">{item.title}</p>
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
    </div>
  );
}
