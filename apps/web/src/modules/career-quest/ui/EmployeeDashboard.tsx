import { RecommendedActivities } from "@/modules/activities";
import { EmployeeProfileView } from "@/modules/career-profile";

export function EmployeeDashboard() {
  return <EmployeeProfileView compact nextStep={<RecommendedActivities />} />;
}
