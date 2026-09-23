export const recommendationsKeys = {
  all: ["recommendations"] as const,
  detail: (employeeId: string) =>
    [...recommendationsKeys.all, employeeId] as const,
};
