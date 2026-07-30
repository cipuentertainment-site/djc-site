import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { getAdminConfigData } from "@/lib/supabase/admin-data";

export default async function SettingsPage() {
  const config = await getAdminConfigData();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Settings"
        description="Manage global booking settings and basic business profile fields."
      />
      {config.status !== "ready" ? (
        <AdminAlert
          title="Settings are protected"
          message={
            config.status === "not_configured"
              ? "Add Supabase environment variables first."
              : config.message
          }
        />
      ) : null}
      <SettingsForm settings={config.data.settings} />
    </div>
  );
}
