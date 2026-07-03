"use client";

import React from "react";
import MultiSelect from "../ui/multiselect";
import { Button } from "../ui/button";
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
  const alreadySelected = repoNames.filter(
    (repoName) => !excludedRepoNames.includes(repoName)
  );
  const [selected, setSelected] = React.useState(alreadySelected);
  const [isPending, startTransition] = React.useTransition();
  const allRepoNames = repoNames.concat(excludedRepoNames);

  const handleSave = () => {
    const reposToExclude = allRepoNames.filter(
      (repoName) => !selected.includes(repoName)
    );
    startTransition(async () => {
      await saveExcludedReposAction({ reposToExclude, username });
    });
  };

  return (
    <div className="my-2 flex justify-end items-center gap-2">
      <div className="w-64">
        <MultiSelect
          selected={selected}
          setSelected={setSelected}
          options={allRepoNames.sort()}
        />
      </div>
      <Button
        type="button"
        className="h-9"
        disabled={isPending}
        onClick={handleSave}
      >
        Save
      </Button>
    </div>
  );
};

export default PRFilter;
