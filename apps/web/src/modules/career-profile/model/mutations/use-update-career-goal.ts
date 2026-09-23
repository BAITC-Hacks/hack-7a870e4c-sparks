"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  careerProfileApi,
  type UpdateCareerGoal,
} from "../../api/career-profile.api";
import { profileKeys } from "../queries/profile.keys";

export function useUpdateCareerGoal(employeeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateCareerGoal) =>
      careerProfileApi.updateGoal(employeeId, body),
    meta: { requiresSession: true },
    retry: false,
    onSuccess: async (profile) => {
      queryClient.setQueryData(profileKeys.detail(employeeId), profile);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["recommendations"] }),
        queryClient.invalidateQueries({ queryKey: ["career-plan"] }),
        queryClient.invalidateQueries({ queryKey: ["hr-overview"] }),
      ]);
    },
  });
}
