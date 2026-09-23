"use client";

import { useSession } from "@/modules/auth";
import { useCareerPlan } from "@/modules/career-plan";
import { useEmployeeProfile } from "@/modules/career-profile";
import { useCatalog } from "@/modules/catalog";
import { getApiErrorStatus } from "@/shared/lib/client/custom-instance";
import {
  mapRecommendation,
  mapRecommendations,
} from "../mappers/recommendations.mapper";
import { useRecommendations } from "./use-recommendations";

export function useRecommendationView(activityId?: string) {
  const session = useSession();
  const employeeId =
    session.data?.role === "employee" ? session.data.employee_id : null;
  const profile = useEmployeeProfile(employeeId);
  const catalog = useCatalog();
  const recommendations = useRecommendations(employeeId);
  // Details use the same recommendation response as the dashboard. No invented event endpoint.
  const items =
    profile.data && catalog.data && recommendations.data
      ? mapRecommendations(recommendations.data, profile.data, catalog.data)
      : [];
  const rawActivity = recommendations.data?.recommendations.find(
    (item) => item.event.event_id === activityId,
  );
  // The plan may offer a different event than a fresh top-three ranking.
  const needsPlan = Boolean(
    activityId && recommendations.isSuccess && !rawActivity,
  );
  const plan = useCareerPlan(needsPlan ? employeeId : null);
  const planActivity = needsPlan
    ? plan.data?.recommendations.find(
        (item) => item.event.event_id === activityId,
      )
    : undefined;
  const detail = rawActivity ?? planActivity;
  const activity =
    detail && profile.data && catalog.data
      ? mapRecommendation(detail, profile.data, catalog.data)
      : undefined;
  const error =
    profile.error ??
    catalog.error ??
    recommendations.error ??
    (needsPlan ? plan.error : null);
  const forbidden = [
    profile.error,
    catalog.error,
    recommendations.error,
    needsPlan ? plan.error : null,
  ].some((value) => [401, 403].includes(getApiErrorStatus(value) ?? 0));
  return {
    response: planActivity || forbidden ? undefined : recommendations.data,
    items: forbidden ? [] : items,
    activity: forbidden ? undefined : activity,
    isPending:
      profile.isPending ||
      catalog.isPending ||
      recommendations.isPending ||
      (needsPlan && plan.isPending),
    isFetching:
      profile.isFetching ||
      catalog.isFetching ||
      recommendations.isFetching ||
      (needsPlan && plan.isFetching),
    error,
    refresh: async () => {
      await Promise.all([
        profile.refetch(),
        catalog.refetch(),
        recommendations.refetch(),
        ...(needsPlan ? [plan.refetch()] : []),
      ]);
    },
  };
}
