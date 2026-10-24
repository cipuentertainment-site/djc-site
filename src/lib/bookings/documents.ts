import { calculateBookingFinancials } from "@/lib/bookings/financials";
import {
  createBookingPdf,
  type BookingDocumentBusiness,
  type BookingDocumentBooking,
  type BookingDocumentFinancials,
  type BookingDocumentInput,
  type BookingDocumentPayment,
  type BookingDocumentType,
} from "@/lib/bookings/pdf";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { bookingDocumentsBucket } from "@/lib/supabase/storage";
import type { AdminBookingDocument } from "@/types/admin-data";

type AdminSupabaseClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

type BookingDocumentContext = {
  booking: BookingDocumentBooking;
  payments: BookingDocumentPayment[];
  financials: BookingDocumentFinancials;
  business: BookingDocumentBusiness;
};

type DocumentSpec = {
  documentType: BookingDocumentType;
  generationKey: string;
  paymentId?: string;
};

export type GeneratedBookingDocument = {
  id: string;
  documentNumber: string;
  status: "generated" | "failed";
  errorMessage: string | null;
};

export type DocumentGenerationResult = {
  documents: GeneratedBookingDocument[];
  errors: string[];
};

const bookingDocumentSelect =
  "id,booking_id,payment_id,document_type,document_number,generation_key,status,issue_date,storage_path,error_message,created_at";

function getNairobiDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getAdminClient() {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Server Supabase configuration is incomplete.");
  }

  return supabase;
}

async function loadBookingDocumentContext(
  supabase: AdminSupabaseClient,
  bookingId: string,
): Promise<BookingDocumentContext> {
  const [bookingResult, paymentsResult, settingsResult] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "booking_reference,customer_name,customer_phone,event_type_name_snapshot,event_size_label_snapshot,duration,attendee_count,event_date,county,location_text,notes,currency,transport_disclaimer_snapshot,agreed_total_amount,booking_services(service_name_snapshot,price_amount_snapshot,currency)",
      )
      .eq("id", bookingId)
      .single(),
    supabase
      .from("booking_payments")
      .select("id,amount,currency,method,transaction_reference,paid_at,created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true }),
    supabase
      .from("global_settings")
      .select("business_name,business_phone,business_whatsapp,business_email,business_location,business_description")
      .eq("id", "default")
      .maybeSingle(),
  ]);

  const error = bookingResult.error ?? paymentsResult.error ?? settingsResult.error;

  if (error || !bookingResult.data) {
    throw new Error(error?.message ?? "Booking could not be loaded for document generation.");
  }

  const booking = bookingResult.data as BookingDocumentBooking & {
    agreed_total_amount: number | null;
  };

  if (booking.agreed_total_amount === null || booking.agreed_total_amount <= 0) {
    throw new Error("The agreed total must be set before documents can be generated.");
  }

  const payments = (paymentsResult.data ?? []) as BookingDocumentPayment[];
  const summary = calculateBookingFinancials(booking.agreed_total_amount, payments);

  if (
    summary.requiredDeposit === null ||
    summary.depositOutstanding === null ||
    summary.remainingBalance === null ||
    summary.depositStatus === "not_set" ||
    summary.paymentStatus === "not_set"
  ) {
    throw new Error("Booking payment totals could not be calculated.");
  }

  return {
    booking: booking as BookingDocumentBooking,
    payments,
    financials: {
      requiredDeposit: summary.requiredDeposit,
      totalReceived: summary.totalReceived,
      depositOutstanding: summary.depositOutstanding,
      remainingBalance: summary.remainingBalance,
      depositStatus: summary.depositStatus,
      paymentStatus: summary.paymentStatus,
    },
    business: (settingsResult.data as BookingDocumentBusiness | null) ?? {
      business_name: "DJC Entertainment",
      business_phone: null,
      business_whatsapp: null,
      business_email: null,
      business_location: null,
      business_description: null,
    },
  };
}

async function createDocumentRecord(
  supabase: AdminSupabaseClient,
  bookingId: string,
  spec: DocumentSpec,
) {
  const existing = await supabase
    .from("booking_documents")
    .select(bookingDocumentSelect)
    .eq("generation_key", spec.generationKey)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  if (existing.data) {
    return existing.data as AdminBookingDocument;
  }

  const number = await supabase.rpc("next_booking_document_number", {
    p_document_type: spec.documentType,
  });

  if (number.error || typeof number.data !== "string") {
    throw new Error(number.error?.message ?? "Document number could not be generated.");
  }

  const storagePath = `bookings/${bookingId}/${number.data}.pdf`;
  const inserted = await supabase
    .from("booking_documents")
    .insert({
      booking_id: bookingId,
      payment_id: spec.paymentId ?? null,
      document_type: spec.documentType,
      document_number: number.data,
      generation_key: spec.generationKey,
      status: "generating",
      issue_date: getNairobiDate(),
      storage_path: storagePath,
    })
    .select(bookingDocumentSelect)
    .single();

  if (!inserted.error && inserted.data) {
    return inserted.data as AdminBookingDocument;
  }

  if (inserted.error?.code === "23505") {
    const retry = await supabase
      .from("booking_documents")
      .select(bookingDocumentSelect)
      .eq("generation_key", spec.generationKey)
      .single();

    if (!retry.error && retry.data) {
      return retry.data as AdminBookingDocument;
    }
  }

  throw new Error(inserted.error?.message ?? "Document record could not be created.");
}

async function ensureDocument(
  supabase: AdminSupabaseClient,
  context: BookingDocumentContext,
  bookingId: string,
  spec: DocumentSpec,
  existingDocument?: AdminBookingDocument,
): Promise<GeneratedBookingDocument> {
  const document = existingDocument ?? (await createDocumentRecord(supabase, bookingId, spec));

  if (document.status === "generated") {
    return {
      id: document.id,
      documentNumber: document.document_number,
      status: "generated",
      errorMessage: null,
    };
  }

  await supabase
    .from("booking_documents")
    .update({ status: "generating", error_message: null })
    .eq("id", document.id);

  try {
    const input: BookingDocumentInput = {
      documentType: spec.documentType,
      documentNumber: document.document_number,
      issueDate: document.issue_date,
      booking: context.booking,
      payments: context.payments,
      financials: context.financials,
      business: context.business,
      payment: spec.paymentId
        ? context.payments.find((payment) => payment.id === spec.paymentId)
        : undefined,
    };
    const pdf = await createBookingPdf(input);
    const upload = await supabase.storage.from(bookingDocumentsBucket).upload(
      document.storage_path,
      Buffer.from(pdf),
      {
        contentType: "application/pdf",
        cacheControl: "3600",
        upsert: true,
      },
    );

    if (upload.error) {
      throw new Error(upload.error.message);
    }

    const update = await supabase
      .from("booking_documents")
      .update({ status: "generated", error_message: null })
      .eq("id", document.id)
      .select(bookingDocumentSelect)
      .single();

    if (update.error || !update.data) {
      throw new Error(update.error?.message ?? "Document metadata could not be updated.");
    }

    return {
      id: document.id,
      documentNumber: document.document_number,
      status: "generated",
      errorMessage: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document generation failed.";
    await supabase
      .from("booking_documents")
      .update({ status: "failed", error_message: message })
      .eq("id", document.id);

    return {
      id: document.id,
      documentNumber: document.document_number,
      status: "failed",
      errorMessage: message,
    };
  }
}

async function generateDocuments(
  bookingId: string,
  specs: DocumentSpec[],
): Promise<DocumentGenerationResult> {
  const supabase = getAdminClient();
  const context = await loadBookingDocumentContext(supabase, bookingId);
  const documents: GeneratedBookingDocument[] = [];
  const errors: string[] = [];

  for (const spec of specs) {
    try {
      const document = await ensureDocument(supabase, context, bookingId, spec);
      documents.push(document);
      if (document.errorMessage) {
        errors.push(`${document.documentNumber}: ${document.errorMessage}`);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Document generation failed.");
    }
  }

  return { documents, errors };
}

export function generateInitialBookingDocuments(bookingId: string, paymentId: string | null) {
  const specs: DocumentSpec[] = [
    {
      documentType: "booking_confirmation",
      generationKey: `booking-confirmation:${bookingId}`,
    },
    {
      documentType: "payment_statement",
      generationKey: `initial-payment-statement:${bookingId}`,
    },
  ];

  if (paymentId) {
    specs.push({
      documentType: "payment_receipt",
      generationKey: `payment-receipt:${paymentId}`,
      paymentId,
    });
  }

  return generateDocuments(bookingId, specs);
}

export function generatePaymentDocuments(bookingId: string, paymentId: string) {
  return generateDocuments(bookingId, [
    {
      documentType: "payment_statement",
      generationKey: `payment-statement:${paymentId}`,
      paymentId,
    },
    {
      documentType: "payment_receipt",
      generationKey: `payment-receipt:${paymentId}`,
      paymentId,
    },
  ]);
}

export async function retryBookingDocument(documentId: string) {
  const supabase = getAdminClient();
  const result = await supabase
    .from("booking_documents")
    .select(bookingDocumentSelect)
    .eq("id", documentId)
    .single();

  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? "Document not found.");
  }

  const document = result.data as AdminBookingDocument;
  if (document.status === "generated") {
    return { documents: [{ id: document.id, documentNumber: document.document_number, status: "generated" as const, errorMessage: null }], errors: [] };
  }

  return generateDocuments(document.booking_id, [
    {
      documentType: document.document_type,
      generationKey: document.generation_key,
      paymentId: document.payment_id ?? undefined,
    },
  ]);
}

export async function generateBookingAppreciationDocument(bookingId: string) {
  const supabase = getAdminClient();
  const context = await loadBookingDocumentContext(supabase, bookingId);

  if (context.booking.event_date >= getNairobiDate()) {
    return { generated: null, errors: ["The appreciation document becomes eligible the day after the event."] };
  }

  if (context.financials.remainingBalance > 0) {
    return { generated: null, errors: ["The appreciation document is waiting for final payment."] };
  }

  const existing = await supabase
    .from("booking_documents")
    .select(bookingDocumentSelect)
    .eq("generation_key", `appreciation:${bookingId}`)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  if (existing.data?.status === "generated") {
    return { generated: existing.data as AdminBookingDocument, errors: [] };
  }

  const generated = await ensureDocument(
    supabase,
    context,
    bookingId,
    {
      documentType: "appreciation",
      generationKey: `appreciation:${bookingId}`,
    },
    existing.data as AdminBookingDocument | undefined,
  );

  return {
    generated: generated.status === "generated" ? generated : null,
    errors: generated.errorMessage ? [generated.errorMessage] : [],
  };
}

export async function generateEligibleAppreciationDocuments() {
  const supabase = getAdminClient();
  const today = getNairobiDate();
  const bookings = await supabase
    .from("bookings")
    .select("id,event_date,agreed_total_amount,status")
    .in("status", ["confirmed", "completed"])
    .lt("event_date", today)
    .not("agreed_total_amount", "is", null)
    .limit(200);

  if (bookings.error) {
    throw new Error(bookings.error.message);
  }

  const generated: GeneratedBookingDocument[] = [];
  const errors: string[] = [];

  for (const booking of bookings.data ?? []) {
    const existing = await supabase
      .from("booking_documents")
      .select(bookingDocumentSelect)
      .eq("generation_key", `appreciation:${booking.id}`)
      .maybeSingle();

    if (existing.error) {
      errors.push(`${booking.id}: ${existing.error.message}`);
      continue;
    }

    if (existing.data?.status === "generated") {
      continue;
    }

    try {
      const context = await loadBookingDocumentContext(supabase, booking.id);
      if (context.financials.remainingBalance > 0) {
        continue;
      }

      const document = await ensureDocument(
        supabase,
        context,
        booking.id,
        {
          documentType: "appreciation",
          generationKey: `appreciation:${booking.id}`,
        },
        existing.data as AdminBookingDocument | undefined,
      );
      generated.push(document);
      if (document.errorMessage) {
        errors.push(`${document.documentNumber}: ${document.errorMessage}`);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${booking.id}: appreciation failed`);
    }
  }

  return { generated, errors };
}

export async function getBookingDocument(documentId: string) {
  const supabase = getAdminClient();
  const result = await supabase
    .from("booking_documents")
    .select(bookingDocumentSelect)
    .eq("id", documentId)
    .single();

  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? "Document not found.");
  }

  return result.data as AdminBookingDocument;
}
