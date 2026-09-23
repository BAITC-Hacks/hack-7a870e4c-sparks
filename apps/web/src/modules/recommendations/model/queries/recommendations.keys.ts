export const recommendationKeys = {
  detail: (employeeId: string) => ["recommendations", employeeId] as const,
};
