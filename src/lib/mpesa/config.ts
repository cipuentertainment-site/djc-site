import {
  mpesaCallbackUrl,
  mpesaConsumerKey,
  mpesaConsumerSecret,
  mpesaEnvironment,
  mpesaPasskey,
  mpesaShortcode,
  mpesaTransactionType,
} from "@/lib/supabase/config";

export type MpesaConfig = {
  environment: "sandbox" | "production";
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  callbackUrl: string;
  transactionType: string;
};

export function getMpesaConfig(): MpesaConfig | null {
  const environment = mpesaEnvironment === "production" ? "production" : "sandbox";

  if (
    !mpesaConsumerKey ||
    !mpesaConsumerSecret ||
    !mpesaShortcode ||
    !mpesaPasskey ||
    !mpesaCallbackUrl
  ) {
    return null;
  }

  return {
    environment,
    baseUrl:
      environment === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke",
    consumerKey: mpesaConsumerKey,
    consumerSecret: mpesaConsumerSecret,
    shortcode: mpesaShortcode,
    passkey: mpesaPasskey,
    callbackUrl: mpesaCallbackUrl,
    transactionType: mpesaTransactionType,
  };
}
