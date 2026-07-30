import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PricingManager } from "@/components/admin/pricing-manager";
import { getAdminConfigData } from "@/lib/supabase/admin-data";

export default async function PricingPage() {
  const config = await getAdminConfigData();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pricing"
        description="Configure prices by Event Type, Event Size, and Service. Missing prices stay visibly unconfigured."
      />
      {config.status !== "ready" ? (
        <AdminAlert
          title="Admin pricing is protected"
          message={
            config.status === "not_configured"
              ? "Add Supabase environment variables first."
              : config.message
          }
        />
      ) : null}
      <PricingManager config={config.data} />
    </div>
  );
}
