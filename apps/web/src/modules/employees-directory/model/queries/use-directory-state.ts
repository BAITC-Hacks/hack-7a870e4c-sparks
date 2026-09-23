"use client";

import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";

const directoryParams = {
  q: parseAsString.withDefault(""),
  department: parseAsString.withDefault(""),
  role: parseAsString.withDefault(""),
  grade: parseAsString.withDefault(""),
  withoutStep: parseAsBoolean.withDefault(false),
  employee: parseAsString,
};

export function useDirectoryState() {
  return useQueryStates(directoryParams, {
    history: "replace",
    shallow: true,
    scroll: false,
  });
}
