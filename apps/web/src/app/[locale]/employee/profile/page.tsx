import { RolePage } from "@/modules/auth";
import { EmployeeProfileView } from "@/modules/career-profile";

export default function EmployeeProfilePage() {
  return (
    <RolePage
      allowedRole="employee"
      titleKey="profileTitle"
      descriptionKey="profileDescription"
    >
      <EmployeeProfileView />
    </RolePage>
  );
}
