# Kat's Beauty Bar

A luxury beauty salon website with an appointment booking system for Kat's Beauty Bar — specialising in Hair, Brows, Lashes, and Nails.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/kats-beauty-bar run dev` — run the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TailwindCSS v4, Framer Motion
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Auth: JWT (jsonwebtoken + bcryptjs) for admin
- Email: Nodemailer (SMTP configurable via env vars)
- Scheduler: node-cron (reminder emails 24h and 2h before appointments)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle database schemas
  - `services.ts` — beauty services
  - `appointments.ts` — customer appointments
  - `admin.ts` — admin users
  - `settings.ts` — business settings (opening hours, slot interval, owner email)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/kats-beauty-bar/src/` — React frontend
- `artifacts/api-server/src/lib/auth.ts` — JWT helpers + requireAdmin middleware
- `artifacts/api-server/src/lib/email.ts` — Nodemailer email sending
- `artifacts/api-server/src/lib/scheduler.ts` — node-cron reminder emails

## Admin Access

- URL: `/admin/login`
- Email: `admin@katbeautybar.co.za`
- Password: `admin123`
- **Change this password after first login!**

## Email Configuration

Set these environment variables to enable real email sending:
- `SMTP_HOST` — your SMTP server hostname
- `SMTP_PORT` — SMTP port (587 for TLS, 465 for SSL)
- `SMTP_USER` — SMTP username/email
- `SMTP_PASS` — SMTP password

Without these, emails are logged to the console in development.

## Business Settings

Editable from the Admin Dashboard → Settings:
- Opening hours per day (Mon–Sun)
- Booking slot interval (default: 30 min)
- Owner notification email

## Architecture decisions

- Smart availability engine: blocks slots dynamically based on service duration — if Nanoplastia (3h) is booked at 10:00, all slots until 13:00 are unavailable
- Double-booking prevention enforced at the API level with conflict checks before insert
- Reminder emails sent at 24h and 2h via a cron job running every 5 minutes with a ±5 minute window
- JWT stored in localStorage as `admin_token`, sent as Bearer header — custom-fetch.ts reads it automatically via setAuthTokenGetter
- Business hours stored as JSON in the `business_settings` key-value table for flexible editing

## Product

Customer-facing: Home, Services, Gallery, About, Contact, and a multi-step booking wizard (service → date → time → details → confirmation). No payments — booking only.

Admin: Secure login, dashboard stats, appointment management (view/edit/reschedule/cancel/complete), service CRUD, business settings, and a visual calendar.

## User preferences

_Populate as you build._

## Gotchas

- After any OpenAPI spec change, run `pnpm --filter @workspace/api-spec run codegen` before restarting the API server
- `pnpm --filter @workspace/db run push` must be run whenever schema files change
- The API server needs a full restart (`dev` command does build + start) to pick up route changes

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
