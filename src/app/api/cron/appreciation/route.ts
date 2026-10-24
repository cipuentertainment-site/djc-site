import { NextResponse } from "next/server";

import { generateEligibleAppreciationDocuments } from "@/lib/bookings/documents";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await generateEligibleAppreciationDocuments();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Appreciation generation failed." },
      { status: 500 },
    );
  }
}
