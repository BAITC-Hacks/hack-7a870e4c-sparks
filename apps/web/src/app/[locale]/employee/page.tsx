import { RolePage } from "@/modules/auth";
import { EmployeeProfileView } from "@/modules/career-profile";

export default function EmployeePage() {
  return (
    <RolePage
      allowedRole="employee"
      titleKey="employeeTitle"
      descriptionKey="employeeDescription"
    >
      <EmployeeProfileView compact />
    </RolePage>
  );
}
