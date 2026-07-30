import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { KENYAN_COUNTIES } from "@/lib/counties";
import type { AdminConfigData } from "@/types/admin-data";

type BookingsFilterFormProps = {
  config: AdminConfigData;
  values: {
    status?: string;
    search?: string;
    eventTypeId?: string;
    county?: string;
    serviceId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
};

export function BookingsFilterForm({ config, values }: BookingsFilterFormProps) {
  return (
    <form className="grid gap-3 rounded-lg border bg-card p-4 lg:grid-cols-4" action="/admin/bookings">
      <Input name="search" placeholder="Customer or phone" defaultValue={values.search} />
      <select
        name="status"
        defaultValue={values.status ?? "pending"}
        className="h-10 rounded-md border border-input bg-card px-3 text-sm"
      >
        {["pending", "confirmed", "completed", "rejected", "all"].map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <select
        name="eventTypeId"
        defaultValue={values.eventTypeId ?? ""}
        className="h-10 rounded-md border border-input bg-card px-3 text-sm"
      >
        <option value="">All event types</option>
        {config.eventTypes.map((eventType) => (
          <option key={eventType.id} value={eventType.id}>
            {eventType.name}
          </option>
        ))}
      </select>
      <select
        name="serviceId"
        defaultValue={values.serviceId ?? ""}
        className="h-10 rounded-md border border-input bg-card px-3 text-sm"
      >
        <option value="">All services</option>
        {config.services.map((service) => (
          <option key={service.id} value={service.id}>
            {service.name}
          </option>
        ))}
      </select>
      <select
        name="county"
        defaultValue={values.county ?? ""}
        className="h-10 rounded-md border border-input bg-card px-3 text-sm"
      >
        <option value="">All counties</option>
        {KENYAN_COUNTIES.map((county) => (
          <option key={county} value={county}>
            {county}
          </option>
        ))}
      </select>
      <DateInput name="dateFrom" defaultValue={values.dateFrom} />
      <DateInput name="dateTo" defaultValue={values.dateTo} />
      <Button type="submit">
        <Search className="h-4 w-4" />
        Filter
      </Button>
    </form>
  );
}
