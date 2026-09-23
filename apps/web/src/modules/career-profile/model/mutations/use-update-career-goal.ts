"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { UpdateGoalBodyOne } from "@/shared/api/generated";

import { careerProfileApi } from "../../api/career-profile.api";
import { profileKeys } from "../queries/profile.keys";

export function useUpdateCareerGoal(employeeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateGoalBodyOne) =>
      careerProfileApi.updateGoal(employeeId, body),
    onSuccess: async (profile) => {
      queryClient.setQueryData(profileKeys.detail(employeeId), profile);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["recommendations"] }),
        queryClient.invalidateQueries({ queryKey: ["career-plan"] }),
        queryClient.invalidateQueries({ queryKey: ["career-advisor"] }),
      ]);
    },
  });
}
