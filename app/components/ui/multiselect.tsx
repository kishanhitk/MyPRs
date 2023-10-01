import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon } from "@radix-ui/react-icons";
import React from "react";
export interface IMultiSelectProps {
  options: string[];
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
}
export default function MultiSelect({
  options,
  selected,
  setSelected,
}: IMultiSelectProps) {
  return (
    <Listbox value={selected} onChange={setSelected} multiple>
      <div className="relative w-full">
        <Listbox.Button className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
          <span className="block truncate">
            {selected.map((option) => option).join(", ")}
          </span>
        </Listbox.Button>
        <Transition
          as={React.Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-popover py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {options.map((option, optionIdx) => (
              <Listbox.Option
                key={optionIdx}
                className="relative cursor-default select-none py-1.5 pl-10 pr-4 text-sm rounded-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                value={option}
              >
                {({ selected }) => (
                  <>
                    {option}
                    {selected ? (
                      <span className="absolute inset-y-0 right-2 flex items-center pl-3">
                        <CheckIcon className="h-4 w-4" />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}
