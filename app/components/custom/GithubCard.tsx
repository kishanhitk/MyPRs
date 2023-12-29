import type { Identifier, XYCoord } from "dnd-core";
import { StarIcon, SmileIcon } from "lucide-react";
import { Button } from "../ui/button";
import type { GitHubIssue } from "~/types/shared";
import { useFetcher, useLoaderData } from "@remix-run/react";
import type { loader } from "~/routes/$username";
import { ChatBubbleIcon, OpenInNewWindowIcon } from "@radix-ui/react-icons";
import PullRequestIcon from "./PullRequestIcon";
import { useDrag, useDrop } from "react-dnd";
import { ItemTypes } from "~/utils/itemTypes";
import { useRef } from "react";
import clsx from "clsx";

interface IGithubCardProps {
  item: GitHubIssue;
  isFeatured?: boolean;
  isOwner?: boolean;
  findCard?: (id: number) => {
    card: any;
    index: number;
  };
  moveCard?: (dragIndex: number, hoverIndex: number) => void;
  index: number;
}

interface DragItem {
  index: number;
  id: string;
  type: string;
}

export function DemoGithub({
  item,
  isFeatured = false,
  isOwner = false,
  index,
  moveCard,
}: IGithubCardProps) {
  const { featured_github_prs } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const toggleFeatured = async (prId: number) => {
    fetcher.submit(
      { prId, featured_github_prs, isFeatured },
      { method: "post", action: "/actions/toggle-featured" }
    );
  };

  // CODE FOR DRAG AND DROP
  const id = item.id;
  const ref = useRef<HTMLDivElement>(null);
  const [{ handlerId }, drop] = useDrop<
    DragItem,
    void,
    { handlerId: Identifier | null }
  >({
    accept: ItemTypes.CARD,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragItem, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      moveCard?.(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.CARD,
    item: () => {
      return { id, index };
    },
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0 : 1;

  drag(drop(ref));

  return (
    <div
      ref={ref}
      style={{ opacity }}
      className={clsx(
        "my-3 border p-4 rounded-md border-slate-300 bg-slate-50/50 dark:bg-slate-900/50 dark:border-slate-700",
        !isDragging && "animate-in"
      )}
      data-handler-id={handlerId}
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
}
