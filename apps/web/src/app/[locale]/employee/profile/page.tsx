import { RolePage } from "@/modules/auth";

export default function EmployeeProfilePage() {
  return (
    <RolePage
      allowedRole="employee"
      titleKey="profileTitle"
      descriptionKey="profileDescription"
    />
  );
}
