# DJC Events Platform

Production-ready MVP foundation for an event services booking platform. The app has a public customer booking-request foundation, a protected admin workspace, Supabase Auth, Supabase data access, and a normalized PostgreSQL schema for event types, event-specific sizes, service pricing, booking snapshots, reservation fees, and confirmed-date capacity.

## Technology Stack

- Next.js 16 with App Router
- TypeScript with strict mode
- Tailwind CSS
- shadcn/ui-style primitives
- Supabase and PostgreSQL
- React Hook Form and Zod
- Recharts
- Lucide React
- date-fns

## Install

```bash
npm install
```

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_SESSION_SECRET=replace-with-a-long-random-server-only-secret
SUPABASE_SERVICE_ROLE_KEY=replace-with-your-server-only-service-role-key
MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=replace-with-your-daraja-consumer-key
MPESA_CONSUMER_SECRET=replace-with-your-daraja-consumer-secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=replace-with-your-daraja-passkey
MPESA_CALLBACK_URL=https://your-public-callback-url/api/payments/mpesa/callback
MPESA_TRANSACTION_TYPE=CustomerPayBillOnline
```

Do not commit real Supabase credentials.

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is still supported as a fallback for older local setups, but new environments should use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Add the same variables in Vercel Project Settings. Set `NEXT_PUBLIC_APP_URL` to the production application URL.

`SUPABASE_SERVICE_ROLE_KEY` and all `MPESA_*` values are server-only. Do not expose them with a `NEXT_PUBLIC_` prefix.

For local Daraja sandbox testing, `MPESA_CALLBACK_URL` must be publicly reachable by Safaricom. A plain `localhost` callback URL can initiate STK Push but will not receive the payment callback unless you expose the app through a tunnel or deploy a preview URL.

## Development

```bash
npm run dev
```

Open `http://localhost:3000`.

Validation checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Folder Structure

```text
src/
  app/
    (public)/
    admin/
    api/
  components/
    admin/
    public/
    ui/
  lib/
    supabase/
    validations/
    utils.ts
  types/
supabase/
  migrations/
```

## Supabase Setup

Run the migration in `supabase/migrations/202607300001_initial_business_schema.sql` against the Supabase project.

Then run:

- `supabase/migrations/202607300002_admin_mvp_extensions.sql`
- `supabase/migrations/202607300003_admin_authentication.sql`
- `supabase/migrations/202607310001_mpesa_service_images.sql`

The migration creates:

- `global_settings`
- `event_types`
- `event_type_sizes`
- `services`
- `service_prices`
- `date_blocks`
- `bookings`
- `booking_services`
- `admin_profiles`
- `event_type_services` in the admin MVP extension
- `reservation_payments`
- `service-images` Supabase Storage bucket

It also creates enums, indexes, updated-at triggers, a confirmed-capacity trigger, and `get_booking_date_availability(from_date, to_date)` for customer date availability.

The admin MVP extension adds event-type/service availability, business profile fields, stricter admin RLS checks through `public.is_admin()`, and an advisory transaction lock around confirmed-capacity updates.

The admin authentication extension adds email-based admin authorization fields and helper functions on the existing `admin_profiles` table.

## Admin Authentication

Admin authentication uses Supabase Auth for identity and passwords. The application database only authorizes who may access the admin portal.

Flow:

1. Visit `/admin/login`.
2. Enter an authorized admin email.
3. Receive a Supabase magic link.
4. Open the magic link and return through `/auth/callback`.
5. Enter the Supabase Auth password on `/admin/verify`.
6. Access `/admin`.

No passwords are stored in application tables.

## Supabase Dashboard Setup

In Supabase Dashboard:

- Enable Email authentication.
- Enable magic links/OTP email login.
- Create the first admin user in Authentication.
- Set the user's password in Supabase Auth.
- Add redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://your-production-domain.com/auth/callback`
- Set the Site URL to the configured application URL.

Then add/enable the matching admin authorization record:

```sql
insert into public.admin_profiles (user_id, email, display_name, role, is_active)
values (
  'auth-user-uuid',
  'admin@example.com',
  'Business Owner',
  'owner',
  true
)
on conflict (user_id) do update
set
  email = excluded.email,
  display_name = excluded.display_name,
  role = excluded.role,
  is_active = true;
```

The `user_id` must match the Supabase Auth user id, and the email must match the authenticated Supabase Auth email.

For the current local first-admin setup, a one-off SQL helper is available at:

```text
supabase/admin/authorize_brioneroo_admin.sql
```

Run it in the Supabase SQL Editor after creating `brioneroo@gmail.com` in Supabase Auth.

## Admin MVP

Admin routes live under `/admin`:

- `/admin`
- `/admin/bookings`
- `/admin/bookings/[id]`
- `/admin/calendar`
- `/admin/event-types`
- `/admin/services`
- `/admin/pricing`
- `/admin/settings`

The admin interface is implemented against the real Supabase schema. It does not use mock records, fake analytics, fake authentication, or fake payments.

## Current Stage Boundaries

- M-Pesa Daraja sandbox STK Push is integrated through server routes.
- Booking insertion from the public form happens only after the Daraja callback marks the reservation payment successful.
- Initial services (`DJ`, `MC`, `Sound System`) are seeded as real business configuration.
- Event types, size ranges, and prices are not seeded because the provided values are examples and should be configured in Supabase.
