import { RolePage } from "@/modules/auth";
import { EmployeesDirectory } from "@/modules/employees-directory";

export default function HrEmployeesPage() {
  return (
    <RolePage
      allowedRole="hr"
      titleKey="employeesTitle"
      descriptionKey="employeesDescription"
    >
      <EmployeesDirectory />
    </RolePage>
  );
}
