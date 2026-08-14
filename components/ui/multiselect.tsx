"use client";

import * as React from "react";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

interface MultiSelectProps {
  selected: string[];
  setSelected: (selected: string[]) => void;
  options: string[];
  triggerLabel: string;
}

export default function MultiSelect({
  selected,
  setSelected,
  options,
  triggerLabel,
}: MultiSelectProps) {
  return (
    <Listbox value={selected} onChange={setSelected} multiple>
      <div className="relative inline-block">
        <Listbox.Button className="font-mono flex items-center gap-1 text-xs text-zinc-500 underline-offset-4 transition-colors duration-150 hover:text-zinc-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-400 dark:text-zinc-400 dark:hover:text-zinc-100">
          {triggerLabel}
          <ChevronDownIcon className="h-3 w-3" aria-hidden />
        </Listbox.Button>
        <Transition
          as={React.Fragment}
          enter="transition duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
          enterFrom="opacity-0 scale-[0.97]"
          enterTo="opacity-100 scale-100"
          leave="transition duration-100 ease-out"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-[0.97]"
        >
          <Listbox.Options className="absolute left-0 z-50 mt-2 max-h-60 w-72 origin-top-left overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-sm focus:outline-none motion-reduce:transition-none dark:border-zinc-800 dark:bg-zinc-900">
            {options.map((option) => (
              <Listbox.Option
                key={option}
                value={option}
                className="font-mono relative cursor-default select-none py-1.5 pl-8 pr-3 text-xs text-zinc-700 outline-none data-[focus]:bg-zinc-100 dark:text-zinc-300 dark:data-[focus]:bg-zinc-800"
              >
                {({ selected: isSelected }) => (
                  <>
                    {option}
                    {isSelected ? (
                      <span className="absolute inset-y-0 left-2 flex items-center text-zinc-900 dark:text-zinc-100">
                        <CheckIcon className="h-3.5 w-3.5" aria-hidden />
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
