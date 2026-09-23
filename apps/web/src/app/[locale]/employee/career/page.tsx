import { RolePage } from "@/modules/auth";

export default function EmployeeCareerPage() {
  return (
    <RolePage
      allowedRole="employee"
      titleKey="careerTitle"
      descriptionKey="careerDescription"
    />
  );
}
