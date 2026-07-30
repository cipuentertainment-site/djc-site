import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import { adminSessionSecret } from "@/lib/supabase/config";

const cookieName = "djc_admin_verified";

type AdminSessionPayload = {
  userId: string;
  email: string;
  verifiedAt: number;
};

function getSecret() {
  if (!adminSessionSecret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured.");
  }

  return adminSessionSecret;
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function encode(payload: AdminSessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(value: string): AdminSessionPayload | null {
  const [body, signature] = value.split(".");

  if (!body || !signature) {
    return null;
  }

  const expected = sign(body);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AdminSessionPayload;
  } catch {
    return null;
  }
}

export async function setAdminVerifiedSession(payload: AdminSessionPayload) {
  const cookieStore = await cookies();

  cookieStore.set(cookieName, encode(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAdminVerifiedSession() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

export async function getAdminVerifiedSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(cookieName)?.value;

  if (!value) {
    return null;
  }

  try {
    return decode(value);
  } catch {
    return null;
  }
}
