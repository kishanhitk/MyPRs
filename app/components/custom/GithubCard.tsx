import { StarIcon, SmileIcon } from "lucide-react";
import { Button } from "../ui/button";
import type { GitHubIssue } from "~/types/shared";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { ChatBubbleIcon, OpenInNewWindowIcon } from "@radix-ui/react-icons";
import PullRequestIcon from "./PullRequestIcon";
import clsx from "clsx";
import { Draggable } from "@hello-pangea/dnd";
import type { loader } from "~/routes/$username";

interface IGithubCardProps {
  item: GitHubIssue;
  isFeatured?: boolean;
  isOwner?: boolean;
  index: number;
  isDraggable?: boolean;
}

export function DemoGithub({
  item,
  isFeatured = false,
  isOwner = false,
  index,
  isDraggable = false,
}: IGithubCardProps) {
  const { featured_github_prs } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const toggleFeatured = async (prId: number) => {
    fetcher.submit(
      { prId, featured_github_prs, isFeatured },
      { method: "post", action: "/actions/toggle-featured" }
    );
  };
  const content = (
    <div
      className={clsx(
        "my-3 border p-4 rounded-md border-slate-300 bg-slate-50/50 dark:bg-slate-900/50 dark:border-slate-700"
      )}
    >
      <div className="space-y-3">
        <div className="flex">
          <h3 className="text-sm text-slate-700 mr-auto dark:text-slate-300">
            {item.repository_url.slice(29)} {item.id}
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
                className="h-5 w-5 cursor-pointer"
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
          <PullRequestIcon className="fill-github_merged h-5 w-5" />
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
    </div>
  );

  return isDraggable ? (
    <Draggable draggableId={item.id.toString()} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          {content}
        </div>
      )}
    </Draggable>
  ) : (
    content
  );
}
