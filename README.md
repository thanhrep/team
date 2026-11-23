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
