import { RolePage } from "@/modules/auth";

export default function EmployeePage() {
  return (
    <RolePage
      allowedRole="employee"
      titleKey="employeeTitle"
      descriptionKey="employeeDescription"
    />
  );
}
