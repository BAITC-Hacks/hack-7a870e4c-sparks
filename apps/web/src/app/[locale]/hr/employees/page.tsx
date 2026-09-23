import { RolePage } from "@/modules/auth";

export default function HrEmployeesPage() {
  return (
    <RolePage
      allowedRole="hr"
      titleKey="employeesTitle"
      descriptionKey="employeesDescription"
    />
  );
}
