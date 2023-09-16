import React from "react";
import MultiSelect from "../ui/multiselect";
import { Form } from "@remix-run/react";
import { Button } from "../ui/button";

export interface IPRFilterProps {
  repoNames: string[];
  excludedRepoNames: string[];
}
const PRFilter = ({ repoNames, excludedRepoNames }: IPRFilterProps) => {
  const alreadySelected = repoNames.filter(
    (repoName) => !excludedRepoNames.includes(repoName)
  );
  const [selected, setSelected] = React.useState(alreadySelected);
  const allRepoNames = repoNames.concat(excludedRepoNames);

  return (
    <div className="my-2 flex justify-end items-center gap-2">
      <div className="w-64">
        <MultiSelect
          selected={selected}
          setSelected={setSelected}
          options={allRepoNames.sort()}
        />
      </div>
      <Form method="post">
        <input
          type="text"
          name="repos_to_exclude"
          hidden
          className="hidden"
          value={allRepoNames.filter(
            (repoName) => !selected.includes(repoName)
          )}
        />
        <Button type="submit" className="h-9">
          Save
        </Button>
      </Form>
    </div>
  );
};

export default PRFilter;
