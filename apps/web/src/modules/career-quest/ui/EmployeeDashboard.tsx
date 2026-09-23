import { EmployeeProfileView } from "@/modules/career-profile";
import { RecommendationsSection } from "@/modules/recommendations";

export function EmployeeDashboard() {
  return <EmployeeProfileView compact nextStep={<RecommendationsSection />} />;
}
