import { RolePage } from "@/modules/auth";
import { CareerPlanView } from "@/modules/career-plan";

export default function EmployeeCareerPage() {
  return (
    <RolePage
      allowedRole="employee"
      titleKey="careerTitle"
      descriptionKey="careerDescription"
    >
      <CareerPlanView />
    </RolePage>
  );
}
