import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { ServiceActions } from "@/components/admin/service-actions";
import { ServiceForm } from "@/components/admin/service-form";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminConfigData } from "@/lib/supabase/admin-data";

export default async function ServicesPage() {
  const config = await getAdminConfigData();
  const { data } = config;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Services"
        description="Manage modular event services. Disabled services disappear from new customer selection but remain in historical booking snapshots."
      />
      {config.status !== "ready" ? (
        <AdminAlert
          title="Admin configuration is protected"
          message={
            config.status === "not_configured"
              ? "Add Supabase environment variables first."
              : config.message
          }
        />
      ) : null}

      <ServiceForm />

      <div className="grid gap-4 lg:grid-cols-2">
        {data.services.length ? (
          data.services.map((service) => (
            <Card key={service.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{service.name}</CardTitle>
                    <CardDescription>{service.description || "No description"}</CardDescription>
                  </div>
                  <StatusBadge status={service.is_active ? "active" : "inactive"} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ServiceForm service={service} />
                <ServiceActions
                  serviceId={service.id}
                  isActive={service.is_active ?? true}
                />
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            title="No services configured"
            description="Add the first service to make it available for event type configuration."
          />
        )}
      </div>
    </div>
  );
}
