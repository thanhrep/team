# BIZWORK 2.0

Clean rebuild of the BIZWORK internal business platform for a 5–20 person football-shirt/teamwear business serving Japan.

## Stack
Next.js App Router + TypeScript, PostgreSQL + Prisma, bcrypt password hashes, signed HttpOnly sessions, server-side role checks, persistent media storage and optional Ollama.

## Spreadsheet license decision
Univer Community core is Apache-2.0. It includes core Sheets editing, formulas, formatting, filtering and sorting. Charts, pivot tables, printing, Office file import/export and real-time collaboration are commercial modules. The application must not claim those paid features are available in the free core. Review official current terms before enabling commercial SDK packages.

## Run locally
1. Install Docker Engine/Compose and Node.js 22.
2. Copy .env.example to .env. Set POSTGRES_PASSWORD, AUTH_SECRET (32+ characters) and a unique BOOTSTRAP_ADMIN_PASSWORD (16+ characters).
3. For host-run Next.js, set DATABASE_URL to localhost; inside Compose use the db service hostname.
4. Start PostgreSQL with docker compose up -d db.
5. Run npm install, npx prisma generate, npx prisma db push, npm run db:seed, then npm run dev.
6. Open http://localhost:3000.

## Production
Use Docker Compose. Run migrations before deploying a new app version. PostgreSQL and Ollama are private network services; only the app binds to localhost. Place HTTPS reverse proxy or a secure tunnel in front. Never expose PostgreSQL or Ollama ports publicly.

## Data safety
The new branch does not migrate or delete legacy database records or uploaded files. Back up the legacy database and media directory before any cutover. The new app uses a separate PostgreSQL schema/database and a separate media root until a reviewed migration is written.

## Roadmap and honest status
Foundation: Next.js scaffold, Prisma schema, pending registration, login/session, user approval API, product API starter, protected media upload/list/rename/delete/view, dashboard and Docker skeleton.
Not complete: fine-grained permissions, rate limiting and CSRF/origin controls, full product CRUD, Univer editor integration and persistence, XLSX/CSV import/export, real-time editing, inventory/order/customer/supplier/finance workflows, Japanese/English localization, optional AI streaming UI, backup/restore automation, migration and end-to-end tests. Do not deploy as production ERP until these are implemented and verified.

## TEAMSPIRIT ERP staging

The staging Next.js ERP uses Supabase Postgres when both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present. Both secrets belong on the **server**. With neither variable, the app uses local SQLite. With only one variable, startup requests fail instead of silently writing to a different database.

Run `supabase/schema.sql` in the Supabase SQL Editor before enabling cloud mode. The schema stores one JSON record per ERP row with a stable ID, a server-only session table and an atomic compare-and-update function. RLS is enabled without public policies; browsers access data only through authenticated Next.js routes. Google Sheets synchronization is explicitly triggered by an Admin and compares each changed cell with the current Sheet value before updating. The Sheet is not the primary database.

For a one-time import from local SQLite to an **empty** Supabase project, run `node scripts/migrate-to-supabase.mjs`. It refuses a populated destination and never removes the source. It rotates the imported Admin password and writes the new credentials into the ignored `data/cloud-admin-credentials.txt`. Back up SQLite before import. Verify with `node scripts/e2e-supabase-sheets.mjs`; this creates one test order and checks two independent sessions, duplicate detection, stale update protection and the actual Google Sheet row.

For hosted staging, set Node.js 22 or newer, build with `npm ci && npm run build`, start with `npm run start`, and configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON` and `GOOGLE_SHEET_ID` as server environment variables. Never deploy the SQLite mode to an ephemeral host as the primary business database. A public launch requires a separate security review, especially rate limits, CSRF/origin checks and media storage.
