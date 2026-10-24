import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/admin";
import { getBookingDocument } from "@/lib/bookings/documents";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { bookingDocumentsBucket } from "@/lib/supabase/storage";

type DocumentDownloadRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: DocumentDownloadRouteProps) {
  await requireAdmin();
  const { id } = await params;
  const document = await getBookingDocument(id);

  if (document.status !== "generated") {
    return NextResponse.json({ ok: false, message: "This document is not ready to download." }, { status: 409 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Document storage is not configured." }, { status: 500 });
  }

  const signed = await supabase.storage
    .from(bookingDocumentsBucket)
    .createSignedUrl(document.storage_path, 60);

  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json({ ok: false, message: signed.error?.message ?? "Document download failed." }, { status: 500 });
  }

  const file = await fetch(signed.data.signedUrl);
  if (!file.ok) {
    return NextResponse.json({ ok: false, message: "Document file could not be retrieved." }, { status: 500 });
  }

  return new NextResponse(await file.arrayBuffer(), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${document.document_number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
