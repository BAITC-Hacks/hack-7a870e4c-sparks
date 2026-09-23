import { ActivityDetails } from "@/modules/activities";
import { RolePage } from "@/modules/auth";

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
