import { RolePage } from "@/modules/auth";

export default function ImportPage() {
  return (
    <RolePage
      allowedRole="hr"
      titleKey="importTitle"
      descriptionKey="importDescription"
    />
  );
}
