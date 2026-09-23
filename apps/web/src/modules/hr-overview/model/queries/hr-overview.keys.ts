export const hrOverviewKeys = {
  all: ["hr-overview"] as const,
  overview: () => [...hrOverviewKeys.all, "overview"] as const,
  employees: () => [...hrOverviewKeys.all, "employees"] as const,
};
