import { RolePage } from "@/modules/auth";
import { HrOverview } from "@/modules/hr-overview";

export default function HrPage() {
  return (
    <RolePage
      allowedRole="hr"
      titleKey="hrTitle"
      descriptionKey="hrDescription"
    >
      <HrOverview />
    </RolePage>
  );
}
