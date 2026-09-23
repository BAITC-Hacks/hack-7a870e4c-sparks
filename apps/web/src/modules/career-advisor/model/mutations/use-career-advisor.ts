"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type AdvisorRequest,
  careerAdvisorApi,
} from "../../api/career-advisor.api";

export function useCareerAdvisor(employeeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["career-advisor", employeeId],
    meta: { requiresSession: true },
    mutationFn: (body: AdvisorRequest) =>
      careerAdvisorApi.chat(employeeId, body),
    retry: false,
    onMutate: () => ({ employeeId }),
    onSuccess: async (_response, _variables, context) => {
      const id = context.employeeId;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["career-plan", id] }),
        queryClient.invalidateQueries({ queryKey: ["recommendations", id] }),
      ]);
    },
  });
}
