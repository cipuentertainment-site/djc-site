export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
export const adminSessionSecret = process.env.ADMIN_SESSION_SECRET;
export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const mpesaEnvironment = process.env.MPESA_ENVIRONMENT ?? "sandbox";
export const mpesaConsumerKey = process.env.MPESA_CONSUMER_KEY;
export const mpesaConsumerSecret = process.env.MPESA_CONSUMER_SECRET;
export const mpesaShortcode = process.env.MPESA_SHORTCODE;
export const mpesaPasskey = process.env.MPESA_PASSKEY;
export const mpesaCallbackUrl = process.env.MPESA_CALLBACK_URL;
export const mpesaTransactionType =
  process.env.MPESA_TRANSACTION_TYPE ?? "CustomerPayBillOnline";

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabasePublishableKey);
}
