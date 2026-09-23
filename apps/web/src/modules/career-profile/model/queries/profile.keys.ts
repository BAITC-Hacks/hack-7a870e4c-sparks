export const profileKeys = {
  all: ["employee-profile"] as const,
  detail: (employeeId: string) => [...profileKeys.all, employeeId] as const,
};
