import { RolePage } from "@/modules/auth";
import { EmployeeDashboard } from "@/modules/career-quest";

export default function EmployeePage() {
  return (
    <RolePage
      allowedRole="employee"
      titleKey="employeeTitle"
      descriptionKey="employeeDescription"
    >
      <EmployeeDashboard />
    </RolePage>
  );
}
