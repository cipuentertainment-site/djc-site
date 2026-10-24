import type {
  AdminBookingDetail,
  AdminServiceCatalogueItem,
  FinalBookingServiceInput,
} from "@/types/admin-data";
export { calculateFinalDetailsTotal } from "@/lib/bookings/financials";

export type EditableFinalBookingService = FinalBookingServiceInput & {
  key: string;
};

export function buildInitialFinalDetails(booking: AdminBookingDetail): EditableFinalBookingService[] {
  if (booking.final_services.length) {
    return booking.final_services.map((service) => ({
      key: service.id,
      serviceId: service.service_id,
      name: service.service_name_snapshot,
      description: service.description_snapshot,
      quantity: service.quantity,
      unitPrice: service.unit_price_amount,
      currency: service.currency,
    }));
  }

  return booking.booking_services.map((service, index) => ({
    key: service.id ?? `requested-${index}`,
    serviceId: service.service_id,
    name: service.service_name_snapshot,
    description: null,
    quantity: 1,
    unitPrice: service.price_amount_snapshot,
    currency: service.currency,
  }));
}

export function addCatalogueService(
  catalogueItem: AdminServiceCatalogueItem,
  key: string,
): EditableFinalBookingService {
  return {
    key,
    serviceId: catalogueItem.id,
    name: catalogueItem.name,
    description: catalogueItem.description,
    quantity: 1,
    unitPrice: catalogueItem.default_price_amount ?? 0,
    currency: catalogueItem.currency,
  };
}
