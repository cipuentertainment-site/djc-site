import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { EventTypeActions } from "@/components/admin/event-type-actions";
import { EventTypeForm } from "@/components/admin/event-type-form";
import { StatusBadge } from "@/components/admin/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminConfigData } from "@/lib/supabase/admin-data";

export default async function EventTypesPage() {
  const config = await getAdminConfigData();
  const { data } = config;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Event Types"
        description="Create event types and configure Small, Medium, and Large attendee ranges per event type."
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

      <EventTypeForm services={data.services} />

      <div className="space-y-4">
        {data.eventTypes.length ? (
          data.eventTypes.map((eventType) => (
            <Card key={eventType.id}>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>{eventType.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {eventType.description || "No description"}
                  </p>
                </div>
                <StatusBadge status={eventType.is_active ? "active" : "inactive"} />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  {data.eventTypeSizes
                    .filter((size) => size.event_type_id === eventType.id)
                    .map((size) => (
                      <div key={size.id} className="rounded-md border p-3">
                        <p className="font-medium capitalize">{size.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {size.min_attendees}-{size.max_attendees} attendees
                        </p>
                      </div>
                    ))}
                </div>
                <EventTypeForm
                  eventType={eventType}
                  sizes={data.eventTypeSizes.filter(
                    (size) => size.event_type_id === eventType.id,
                  )}
                  relationships={data.eventTypeServices.filter(
                    (item) => item.event_type_id === eventType.id,
                  )}
                  services={data.services}
                />
                <EventTypeActions
                  eventTypeId={eventType.id}
                  isActive={eventType.is_active ?? true}
                />
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            title="No event types configured"
            description="Create an event type before configuring pricing or accepting requests."
          />
        )}
      </div>
    </div>
  );
}
