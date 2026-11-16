# Land Ledger — source code

A private estate dashboard with 96 editable plot records, a schematic map, customers, bookings, payments, installments, receipts, expenses, exports and activity history.

## Run on your computer

This is a React/TypeScript application using Vinext and Cloudflare D1. It is not a standalone HTML file; do not open it by double-clicking an HTML page.

Install Node.js 22.13 or later. Extract this ZIP, open a terminal in the land-ledger folder, and run:

```sh
npm ci
npm run check:plan
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_glamorous_blockbuster.sql
npm run dev
```

Open the local URL shown in the terminal (normally http://localhost:5173). Click Sign in to enable the local development identity. The portable development mode simulates sign-in locally; it does not sign into your hosted account.

## What is included

- app/page.tsx: dashboard and workflows
- app/globals.css: responsive styling
- app/site-plan.ts: shared plot measurements, geometry, totals and plan revision
- app/seed.ts: initial plot register
- app/estate-map.tsx: interactive plan matching the photograph
- app/migrate-plan.ts: compatible upgrade of existing imported records
- app/api/state/route.ts: authenticated persistence API
- app/validate.ts: record and payment validation
- db/ and drizzle/: database schema and migration
- public/site-map.png: your supplied map photograph
- scripts/, worker/, configuration, and dependency lockfile

## Data and deployment

This download contains source code and the initial plot register, not a copy of the live customer/payment database. Local data is separate from the hosted site. Use Reports on the hosted dashboard to download records.

The original Sites project identifier is retained in .openai/hosting.json to identify the existing project; it is not a credential. No passwords, source-access tokens, installed dependencies, or local test databases are included.

Production sign-in depends on the Sites hosting integration. Deployment elsewhere requires configuring your own identity/access boundary and Cloudflare D1 binding; do not expose the API publicly without authentication.

## Before using real records

All transcribed plot dimensions need verification against original documents. Availability and customer records have not been assumed. The digital map is schematic, not a surveyed plan. Square-foot areas must be entered after verification; no marla conversion is assumed.

Build, TypeScript and data-validation checks passed. Authenticated browser saving was not verified during initial delivery. Validate a test record and reload before entering live records.

Refunds, transfers, document uploads, multi-user roles and automated reminders are not implemented in this version.

## Updated site plan

The digital map follows the supplied photograph: plots 12–1 run down the right edge, plots 13–24 form the upper block, plots 53–25 run above the internal road, and the lower rows are separated by a 30-foot road between 71/72 and 83/82. The 11-foot Kahal separates plots 3 and 2. No compass direction is assumed.

Use the digital map's zoom controls to enlarge or reduce the plan from 50% to 250%. Scroll inside the map to explore an enlarged view; **Fit map** returns the whole plan to the available viewport. Road edges are derived from adjacent plot coordinates so the upper branches and right-side road stay aligned.

Plot 47 is labelled 7 marla with 27′ × 50′ dimensions in the photograph. Both values are retained with a review note. Pen crosses are not interpreted as sales or availability. Plan totals remain 227,480 sq ft of land, 179,900 sq ft of plots, and 47,580 sq ft of roads; individual confirmed areas stay unset until verified.

Existing records are upgraded on API read and persisted on the next save. Only untouched, unverified imported measurements are refreshed. Manually edited or verified measurements, custom notes, buyers, statuses, prices, payments, expenses and schedules are preserved. The database stores the estate as JSON, so no SQL schema migration is required.
