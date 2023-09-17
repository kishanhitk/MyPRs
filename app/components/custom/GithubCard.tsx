import { StarIcon, GitPullRequest, SmileIcon } from "lucide-react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

import type { GitHubIssue } from "~/types/shared";
import { useFetcher, useLoaderData } from "@remix-run/react";
import type { loader } from "~/routes/$username";
import { ChatBubbleIcon, OpenInNewWindowIcon } from "@radix-ui/react-icons";

interface IGithubCardProps {
  item: GitHubIssue;
  isFeatured?: boolean;
}

export function DemoGithub({ item, isFeatured = false }: IGithubCardProps) {
  const { featured_github_prs } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const toggleFeatured = async (prId: number) => {
    fetcher.submit(
      { prId, featured_github_prs, isFeatured },
      { method: "post", action: "/actions/toggle-featured" }
    );
  };

  return (
    <Card className="my-2">
      <CardHeader className="grid grid-cols-[1fr_110px] items-start gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-xl font-semibold">
            {item.repository_url.slice(29)}
          </CardTitle>
          <div className="flex">
            <GitPullRequest className="text-github_merged inline mr-2" />
            <CardDescription className="text-lg">{item.title}</CardDescription>
          </div>
        </div>
        <div className="flex flex-col space-y-2 ">
          <a href={item.html_url}>
            <Button className="flex w-full" variant="default">
              <OpenInNewWindowIcon className="mr-2 h-4 w-4" />
              Visit
            </Button>
          </a>
          <Button
            disabled={
              fetcher.state === "submitting" || fetcher.state === "loading"
            }
            className="flex"
            onClick={async () => {
              toggleFeatured(item.id);
            }}
            variant={isFeatured ? "outline" : "secondary"}
          >
            <StarIcon className="mr-2 h-4 w-4 shrink-0" />

            {isFeatured ? "Unfeature" : "Feature"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <SmileIcon className="mr-1 h-4 w-4" />
            {item.reactions.total_count}
          </div>
          <div className="flex items-center">
            <ChatBubbleIcon className="mr-1 h-4 w-4" />
            {item.comments}
          </div>
          <div>
            Merged on:{" "}
            {new Date(item.pull_request.merged_at).toDateString().slice(4)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
