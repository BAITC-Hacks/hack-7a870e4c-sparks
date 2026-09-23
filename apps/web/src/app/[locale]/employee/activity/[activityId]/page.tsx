import { RolePage } from "@/modules/auth";
import { ActivityDetails } from "@/modules/recommendations";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ activityId: string }>;
}) {
  const { activityId } = await params;
  return (
    <RolePage
      allowedRole="employee"
      titleKey="activityTitle"
      descriptionKey="activityDescription"
    >
      <ActivityDetails activityId={activityId} />
    </RolePage>
  );
}
