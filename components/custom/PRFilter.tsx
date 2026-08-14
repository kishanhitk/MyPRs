"use client";

import React from "react";
import MultiSelect from "../ui/multiselect";
import { saveExcludedReposAction } from "~/utils/pr-actions";

export interface IPRFilterProps {
  repoNames: string[];
  excludedRepoNames: string[];
  username: string;
}

const PRFilter = ({
  repoNames,
  excludedRepoNames,
  username,
}: IPRFilterProps) => {
  const allRepoNames = [...new Set(repoNames.concat(excludedRepoNames))].sort();
  const savedSelection = allRepoNames.filter(
    (repoName) => !excludedRepoNames.includes(repoName)
  );
  const [selected, setSelected] = React.useState(savedSelection);
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const dirty =
    selected.length !== savedSelection.length ||
    selected.some((repo) => !savedSelection.includes(repo));

  const handleSave = () => {
    const reposToExclude = allRepoNames.filter(
      (repoName) => !selected.includes(repoName)
    );
    startTransition(async () => {
      const result = await saveExcludedReposAction({ reposToExclude, username });
      setError(result?.error ?? null);
    });
  };

  return (
    <div className="font-mono flex items-baseline gap-3 text-xs">
      <MultiSelect
        selected={selected}
        setSelected={setSelected}
        options={allRepoNames}
        triggerLabel={`${selected.length} of ${allRepoNames.length} repositories shown`}
      />
      {dirty ? (
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="appear text-github_merged underline-offset-4 hover:underline active:scale-95 disabled:opacity-40 dark:text-[#A371F7]"
        >
          {isPending ? "saving…" : "save"}
        </button>
      ) : null}
      {error ? (
        <span role="alert" className="appear text-red-500">
          {error}
        </span>
      ) : null}
    </div>
  );
};

export default PRFilter;
