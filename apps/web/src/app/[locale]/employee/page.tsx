import { RolePage } from "@/modules/auth";
import { EmployeeProfileView } from "@/modules/career-profile";
import { RecommendationsSection } from "@/modules/recommendations";

export default function EmployeePage() {
  return (
    <RolePage
      allowedRole="employee"
      titleKey="employeeTitle"
      descriptionKey="employeeDescription"
    >
      <EmployeeProfileView compact nextStep={<RecommendationsSection />} />
    </RolePage>
  );
}
