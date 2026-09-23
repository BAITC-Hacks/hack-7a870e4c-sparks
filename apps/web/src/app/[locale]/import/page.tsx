import { RolePage } from "@/modules/auth";
import { DataImportView } from "@/modules/data-import";

export default function ImportPage() {
  return (
    <RolePage
      allowedRole="hr"
      titleKey="importTitle"
      descriptionKey="importDescription"
    >
      <DataImportView />
    </RolePage>
  );
}
