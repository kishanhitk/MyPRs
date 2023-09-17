import { StarIcon, CircleIcon } from "lucide-react";
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
          <CardTitle className="text-xl">
            {item.repository_url.slice(29)}
          </CardTitle>
          <CardDescription className="text-lg">{item.title}</CardDescription>
        </div>
        <Button
          disabled={
            fetcher.state === "submitting" || fetcher.state === "loading"
          }
          className="flex"
          onClick={async () => {
            toggleFeatured(item.id);
          }}
          variant={isFeatured ? "outline" : "default"}
        >
          <StarIcon className="mr-2 h-4 w-4" />
          Feature
        </Button>
        {/* <div className="flex items-center space-x-1 rounded-md bg-secondary text-secondary-foreground">
          <Button variant="secondary" className="px-3 shadow-none">
            <StarIcon className="mr-2 h-4 w-4" />
            Star
          </Button>
          <Separator orientation="vertical" className="h-[20px]" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" className="px-2 shadow-none">
                <ChevronDownIcon className="h-4 w-4 text-secondary-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              alignOffset={-5}
              className="w-[200px]"
              forceMount
            >
\
              <DropdownMenuItem>
                <PlusIcon className="mr-2 h-4 w-4" /> Add to Featured
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div> */}
      </CardHeader>
      <CardContent>
        <div className="flex space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <CircleIcon className="mr-1 h-3 w-3 fill-sky-400 text-sky-400" />
            TypeScript
          </div>
          <div className="flex items-center">
            <StarIcon className="mr-1 h-3 w-3" />
            20k
          </div>
          <div>Updated April 2023</div>
        </div>
      </CardContent>
    </Card>
  );
}
