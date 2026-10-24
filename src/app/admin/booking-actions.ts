"use server";

import { revalidatePath } from "next/cache";

import {
  generateBookingAppreciationDocument,
  generateInitialBookingDocuments,
  generatePaymentDocuments,
  retryBookingDocument,
} from "@/lib/bookings/documents";
import { requireAdminAction } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  confirmBookingFormSchema,
  recordBookingPaymentFormSchema,
  type ConfirmBookingFormInput,
  type RecordBookingPaymentFormInput,
} from "@/lib/validations/admin";

export type BookingWorkflowResult = {
  ok: boolean;
  message: string;
  paymentId?: string | null;
  documentIds?: string[];
  documentErrors?: string[];
};

async function getBookingActionClient() {
  const admin = await requireAdminAction();

  if (!admin.ok) {
    return { ok: false as const, result: { ok: false, message: admin.message } };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false as const,
      result: { ok: false, message: "Supabase environment variables are not configured." },
    };
  }

  return { ok: true as const, supabase };
}

function actionError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("capacity") || message.includes("no longer available")) {
    return "This event date is no longer available.";
  }

  if (message.includes("transaction reference") || message.includes("payment method")) {
    return "Enter a payment method and the required transaction reference.";
  }

  if (message.includes("exceed") || message.includes("greater than zero") || message.includes("negative")) {
    return "Check the payment amounts and try again.";
  }

  if (message.includes("already confirmed")) {
    return "This booking has already been confirmed.";
  }

  if (message.includes("unique") || message.includes("duplicate")) {
    return "This payment or transaction reference has already been recorded.";
  }

  if (message.includes("admin") || message.includes("row-level security") || message.includes("permission")) {
    return "Admin authentication is required before this action can be completed.";
  }

  return error instanceof Error ? error.message : "The booking action could not be completed.";
}

function getRpcRow(data: unknown) {
  if (!Array.isArray(data)) {
    return null;
  }

  return data[0] as { booking_id?: string; payment_id?: string | null } | undefined;
}

function revalidateBooking(bookingId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/calendar");
}

export async function confirmBookingWithPaymentAction(
  input: ConfirmBookingFormInput,
): Promise<BookingWorkflowResult> {
  const parsed = confirmBookingFormSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the confirmation details." };
  }

  const client = await getBookingActionClient();
  if (!client.ok) {
    return client.result;
  }

  const result = await client.supabase.rpc("confirm_booking_with_payment", {
    p_booking_id: parsed.data.bookingId,
    p_agreed_total_amount: parsed.data.agreedTotalAmount,
    p_initial_payment_amount: parsed.data.initialPaymentAmount,
    p_payment_method: parsed.data.initialPaymentAmount > 0 ? parsed.data.paymentMethod : null,
    p_transaction_reference:
      parsed.data.initialPaymentAmount > 0 ? parsed.data.transactionReference || null : null,
    p_idempotency_key: parsed.data.idempotencyKey,
  });

  if (result.error) {
    return { ok: false, message: actionError(result.error) };
  }

  const row = getRpcRow(result.data);
  if (!row?.booking_id) {
    return { ok: false, message: "The booking was not confirmed." };
  }

  let documents;
  try {
    documents = await generateInitialBookingDocuments(row.booking_id, row.payment_id ?? null);
  } catch (error) {
    revalidateBooking(row.booking_id);
    return {
      ok: true,
      message: `Booking confirmed, but documents could not be generated: ${actionError(error)}`,
      paymentId: row.payment_id ?? null,
      documentErrors: [actionError(error)],
    };
  }

  revalidateBooking(row.booking_id);
  return {
    ok: true,
    message: documents.errors.length
      ? "Booking confirmed. Some documents need a retry from the Documents section."
      : "Booking confirmed and documents generated.",
    paymentId: row.payment_id ?? null,
    documentIds: documents.documents.filter((item) => item.status === "generated").map((item) => item.id),
    documentErrors: documents.errors,
  };
}

export async function recordBookingPaymentAction(
  input: RecordBookingPaymentFormInput,
): Promise<BookingWorkflowResult> {
  const parsed = recordBookingPaymentFormSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the payment details." };
  }

  const client = await getBookingActionClient();
  if (!client.ok) {
    return client.result;
  }

  const result = await client.supabase.rpc("record_booking_payment", {
    p_booking_id: parsed.data.bookingId,
    p_amount: parsed.data.amount,
    p_payment_method: parsed.data.paymentMethod,
    p_transaction_reference: parsed.data.transactionReference || null,
    p_idempotency_key: parsed.data.idempotencyKey,
  });

  if (result.error || typeof result.data !== "string") {
    return { ok: false, message: actionError(result.error) };
  }

  const paymentId = result.data;
  let documents;
  try {
    documents = await generatePaymentDocuments(parsed.data.bookingId, paymentId);
  } catch (error) {
    revalidateBooking(parsed.data.bookingId);
    return {
      ok: true,
      message: `Payment recorded, but documents could not be generated: ${actionError(error)}`,
      paymentId,
      documentErrors: [actionError(error)],
    };
  }

  let appreciationGenerated = false;
  try {
    appreciationGenerated = Boolean(
      (await generateBookingAppreciationDocument(parsed.data.bookingId)).generated,
    );
  } catch {
    // Payment documents remain recoverable even if appreciation generation needs a later retry.
  }

  revalidateBooking(parsed.data.bookingId);
  return {
    ok: true,
    message: documents.errors.length
      ? "Payment recorded. Some documents need a retry from the Documents section."
      : appreciationGenerated
        ? "Payment recorded, documents generated, and appreciation document saved."
        : "Payment recorded and documents generated.",
    paymentId,
    documentIds: documents.documents.filter((item) => item.status === "generated").map((item) => item.id),
    documentErrors: documents.errors,
  };
}

export async function retryBookingDocumentAction(documentId: string): Promise<BookingWorkflowResult> {
  const client = await getBookingActionClient();
  if (!client.ok) {
    return client.result;
  }

  try {
    const result = await retryBookingDocument(documentId);
    const document = result.documents[0];
    if (!document) {
      return { ok: false, message: "Document could not be retried." };
    }

    revalidatePath("/admin");
    return {
      ok: document.status === "generated",
      message: document.status === "generated" ? "Document generated." : "Document generation failed.",
      documentIds: document.status === "generated" ? [document.id] : [],
      documentErrors: result.errors,
    };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function generateBookingAppreciationAction(
  bookingId: string,
): Promise<BookingWorkflowResult> {
  const client = await getBookingActionClient();
  if (!client.ok) {
    return client.result;
  }

  try {
    const result = await generateBookingAppreciationDocument(bookingId);
    revalidateBooking(bookingId);

    if (!result.generated) {
      return { ok: false, message: result.errors[0] ?? "Appreciation document is not eligible yet." };
    }

    return {
      ok: true,
      message: "Appreciation document generated.",
      documentIds: [result.generated.id],
      documentErrors: result.errors,
    };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}
