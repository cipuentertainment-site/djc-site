import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { MerchandiseMediaManager } from "@/components/admin/merchandise-media-manager";
import { getAdminMerchandiseMediaData } from "@/lib/supabase/admin-data";

export default async function MerchandiseMediaPage() {
  const data = await getAdminMerchandiseMediaData();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Merchandise & Media"
        description="Manage public merchandise, recent work, and incoming merchandise requests."
      />
      {data.status !== "ready" ? (
        <AdminAlert
          title="Merchandise and media are protected"
          message={
            data.status === "not_configured"
              ? "Add Supabase environment variables first."
              : data.message
          }
        />
      ) : null}
      <MerchandiseMediaManager data={data.data} />
    </div>
  );
}
