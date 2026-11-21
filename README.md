# Land Ledger

A private estate dashboard: 96 plot records from the site plan, an interactive plot map, customers, bookings, payments, installments, receipts, expenses, CSV/JSON exports and an activity log. Amounts are in PKR.

**Stack:** Next.js 16 (App Router) · React 19 · MongoDB · TypeScript · Zod

## Getting started

Requirements: Node.js 20.9 or later, and a MongoDB database (MongoDB Atlas or a local `mongod`).

1. Install dependencies:

   ```sh
   npm install
   ```

2. Put your connection string in `.env` (copy `.env.example` if `.env` doesn't exist):

   ```sh
   MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB=land_ledger
   ```

   The collections and indexes are created automatically the first time the app connects. There are no migrations to run.

3. Start the app:

   ```sh
   npm run dev
   ```

   Open http://localhost:3000, click **Create an account**, and you're in.

## Scripts

| Command              | What it does                                                    |
| -------------------- | --------------------------------------------------------------- |
| `npm run dev`        | Development server with hot reload (http://localhost:3000)      |
| `npm run build`      | Production build                                                |
| `npm start`          | Run the production build                                        |
| `npm run lint`       | ESLint                                                          |
| `npm run format`     | Format everything with Prettier                                 |
| `npm run check:plan` | Checks the site plan, validation, plan migration and map clicks |

## Project structure

```
app/
  page.tsx               Home: redirects to /login unless signed in, then renders the dashboard
  dashboard.tsx          The whole dashboard UI (client component)
  estate-map.tsx         Interactive SVG plot map
  login/, signup/        Auth pages (both use auth-form.tsx)
  api/auth/signup        POST: create account + start session
  api/auth/login         POST: check password + start session
  api/auth/logout        POST: end session
  api/state              GET: load estate · PUT: save estate
  site-plan.ts           Plot measurements and map geometry from the supplied plan
  seed.ts                The starting estate for a new account
  validate.ts            Zod schema for every record (used by the API before saving)
  migrate-plan.ts        Upgrades unverified plot data when the site plan changes
lib/
  mongodb.ts             MongoDB connection, collection types, indexes
  auth.ts                Password hashing, sessions, getCurrentUser()
  http.ts                JSON request helpers
scripts/check-site-plan.mjs
public/site-map.png      The original photographed plan
```

## How authentication works

- **Sign-up** stores the user with the email lowercased and the password hashed with scrypt (Node's built-in `crypto`, random salt per user). The plain password is never stored.
- **Sign-in** compares the hash in constant time. Wrong passwords and unknown emails return the same message, so the form doesn't reveal which emails are registered.
- **Sessions:** on success the server creates a random 256-bit token. The browser gets it in an `httpOnly`, `SameSite=Lax` cookie named `session`, which is also `Secure` in production. MongoDB stores only the token's SHA-256 hash.
- **Every request** looks up the session by that hash. Sessions last 30 days, and MongoDB deletes expired ones automatically through a TTL index.
- **Sign-out** deletes the session from the database and clears the cookie.
- **Write endpoints** only accept `Content-Type: application/json`. This blocks cross-site form submissions (CSRF).

In production the session cookie is `Secure`, so serve the app over HTTPS. `localhost` is fine for testing.

## How data is stored

MongoDB database `MONGODB_DB` (default `land_ledger`):

| Collection | One document per | Key fields                                                                                                                                                 |
| ---------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`    | account          | `name`, `email` (unique), `passwordHash`, `createdAt`                                                                                                      |
| `sessions` | signed-in device | `tokenHash` (unique), `userId`, `expiresAt` (TTL)                                                                                                          |
| `estates`  | user             | `_id` = the owner's user `_id`, `version`, `updatedAt`, `data` = `{ name, planVersion, plots[96], buyers[], payments[], schedule[], expenses[], audit[] }` |

Each user's whole estate is one document.

- **Loading:** the dashboard loads it once with `GET /api/state`.
- **Saving:** every change sends the full estate back with `PUT /api/state`. The server validates it against `app/validate.ts` before writing.
- **Conflicts:** each save must send the `version` it loaded, and the server only writes if that version still matches. If two windows edit at once, the second gets "Data changed in another window" instead of overwriting the first.

Totals, balances and overdue amounts are calculated in the browser and never stored.

## Site plan notes

- **The digital map is a schematic** of `public/site-map.png`, not a surveyed plan.
- **Every transcribed dimension needs checking.** Verify each against the original documents, and enter square-foot areas only once confirmed. No marla conversion is assumed.
- **Plot 47 has a discrepancy.** The plan labels it 7 marla with 27′ × 50′ dimensions; both values are kept with a review note.
- **Pen marks on the photo aren't interpreted.** Crosses are not read as sales or availability.
- **Plan totals:** 227,480 sq ft of land, 179,900 sq ft of plots, 47,580 sq ft of roads.
- **Updating the plan:** when `PLAN_VERSION` in `site-plan.ts` changes, `migrate-plan.ts` refreshes only untouched, unverified plots on the next load. Verified or edited measurements, notes and all customer and financial records are kept.

Not implemented yet: refunds, plot transfers, document uploads, multi-user roles, password reset, and automated reminders.
