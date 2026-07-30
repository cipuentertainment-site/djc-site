import { getMpesaConfig } from "@/lib/mpesa/config";

type CachedToken = {
  token: string;
  expiresAt: number;
};

let cachedToken: CachedToken | null = null;

export type StkPushInput = {
  amount: number;
  phoneNumber: string;
  accountReference: string;
  transactionDescription: string;
};

export type StkPushResult =
  | {
      ok: true;
      merchantRequestId: string;
      checkoutRequestId: string;
      responseDescription: string;
      customerMessage: string;
    }
  | {
      ok: false;
      message: string;
    };

async function getAccessToken() {
  const config = getMpesaConfig();

  if (!config) {
    return null;
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(
    `${config.consumerKey}:${config.consumerSecret}`,
  ).toString("base64");
  const response = await fetch(
    `${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: string;
  };

  if (!data.access_token) {
    return null;
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000,
  };

  return cachedToken.token;
}

export async function initiateStkPush(input: StkPushInput): Promise<StkPushResult> {
  const config = getMpesaConfig();

  if (!config) {
    return { ok: false, message: "M-Pesa is not configured." };
  }

  const accessToken = await getAccessToken();

  if (!accessToken) {
    return { ok: false, message: "Unable to authenticate with M-Pesa." };
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const password = Buffer.from(
    `${config.shortcode}${config.passkey}${timestamp}`,
  ).toString("base64");
  const response = await fetch(`${config.baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: config.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: config.transactionType,
      Amount: input.amount,
      PartyA: input.phoneNumber,
      PartyB: config.shortcode,
      PhoneNumber: input.phoneNumber,
      CallBackURL: config.callbackUrl,
      AccountReference: input.accountReference,
      TransactionDesc: input.transactionDescription,
    }),
    cache: "no-store",
  });

  const data = (await response.json()) as {
    MerchantRequestID?: string;
    CheckoutRequestID?: string;
    ResponseDescription?: string;
    CustomerMessage?: string;
    errorMessage?: string;
  };

  if (!response.ok || !data.CheckoutRequestID || !data.MerchantRequestID) {
    return {
      ok: false,
      message: data.errorMessage ?? "M-Pesa STK Push could not be initiated.",
    };
  }

  return {
    ok: true,
    merchantRequestId: data.MerchantRequestID,
    checkoutRequestId: data.CheckoutRequestID,
    responseDescription: data.ResponseDescription ?? "STK Push accepted.",
    customerMessage: data.CustomerMessage ?? "Check your phone.",
  };
}
