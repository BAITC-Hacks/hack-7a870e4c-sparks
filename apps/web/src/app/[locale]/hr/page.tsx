import { RolePage } from "@/modules/auth";

export default function HrPage() {
  return (
    <RolePage
      allowedRole="hr"
      titleKey="hrTitle"
      descriptionKey="hrDescription"
    />
  );
}
