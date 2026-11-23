# BIZWORK - Japan Football Uniform ERP & Spreadsheet

BIZWORK is an independent, secure Modular Monolith web platform engineered for football kits, teamwear, and sports uniform businesses targeting the Japanese market.

---

## 🌟 CORE HIGHLIGHTS

1. **Strict User Registration & Role-Based Access Control (RBAC)**:
   - Newly registered accounts default to `PENDING`.
   - Direct API endpoints and database views are strictly guarded at the backend level.
   - Comprehensive audit logging for all business transactions.

2. **Decoupled Media Asset Library with Stable Identifiers (`@code`)**:
   - Sequential, immutable image references (`@1`, `@2`, etc.) mapped directly via database entity IDs.
   - Preserves formula and cell integrity regardless of file renames or storage migrations.

3. **Autonomous Spreadsheet Engine**:
   - Zero reliance on external spreadsheet services or cloud suites.
   - Supports formula recalculations, cell formatting, currency conversion (JPY/VND), and XLSX export.

4. **Japan E-Commerce & Uniform Customization**:
   - Pre-configured sizing standards, custom player name & number personalization.
   - Domestic Japanese delivery metadata support (7-digit postal codes, prefectures, and regional logistics).

---

## 🚀 INSTALLATION & PRODUCTION SETUP

Refer to internal operations documentation for server deployment instructions, environment variables configuration, and initial administrator credential provisioning.

## Secure deployment checklist

1. Copy `.env.example` to `.env` and replace all placeholders. Generate the application key with `openssl rand -hex 32`; use a separate strong database password.
2. Set `DOMAIN` and `CORS_ORIGINS` to the real HTTPS hostname(s). Do not use wildcard CORS for credentialed sessions.
3. Start PostgreSQL and the application with `docker compose up -d --build`.
4. Provision the first administrator once with `docker compose exec app python -m app.seed`. The seed command prompts for an administrator password if `ADMIN_INIT_PASSWORD` is not supplied.
5. Public registration always creates a pending STAFF account. Only an approved administrator can grant access; only Super Admin can grant ADMIN or SUPER_ADMIN.
6. Back up the PostgreSQL volume and the uploads volume separately before upgrades.

## Current hardening included on the full-hardening branch

- JWT signing now requires a configured secret of at least 32 characters; the production compose file no longer supplies a built-in password or signing key.
- Credentialed CORS is limited to configured origins and HTTPS login cookies are marked Secure.
- Public registration cannot claim the first-user Super Admin role. Privileged role changes are restricted.
- Image uploads validate file content and size, accept batches, retain the operator-entered display name, and derive stable image codes from database IDs.
- Order requests validate positive quantities and non-negative prices, reserve stock under row locks, reject insufficient inventory, and restore stock when an order is cancelled.
- Spreadsheet autosaves are serialized and save every existing worksheet rather than only the first one.
- The dashboard reads monthly sales, orders, profit and stock totals from the database instead of showing sample numbers.
- GitHub Actions compiles the backend and runs regression tests on pushes and pull requests.

## Important operational notes

This repository still uses SQLAlchemy `create_all` rather than a versioned migration system. Before changing existing production schemas, take a database backup and introduce Alembic migrations. Uploaded media is currently served from the static directory; do not treat its URLs as private file storage. The browser spreadsheet library is Luckysheet, not a complete Google Sheets replacement; validate formula, chart, image and concurrent-edit behavior against actual business workflows before relying on it for critical accounting.
