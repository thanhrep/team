# BIZWORK self-hosted server

This folder documents the intended always-on Windows host for the BIZWORK web application.

## Runtime layout

- FastAPI serves the existing BIZWORK UI and API.
- PostgreSQL stores employee accounts, workbooks, product/order data and image metadata.
- Product image originals and WebP thumbnails live under `backend/data/media`, outside the static web root.
- Ollama runs locally on the same PC. Default model: `llama3.2:1b`.
- Cloudflare Tunnel (optional, only if the existing DNS provider/domain can point to a Cloudflare Tunnel) publishes HTTPS without router port forwarding.

## First-time setup

1. Install 64-bit Python 3.11+, PostgreSQL, and Ollama on the server PC.
2. Install Ollama model: `ollama pull llama3.2:1b`.
3. Create a PostgreSQL database and user; set `DATABASE_URL` in the server environment.
4. Install backend dependencies: `python -m pip install -r backend/requirements.txt`.
5. Set a long random `SECRET_KEY`; keep `BIZWORK_AUTH_DISABLED=false`.
6. Seed the initial administrator using the documented seed environment variables. Never publish the seed password.
7. Start the app once and verify `/api/health`, `/api/ai/status`, login and media upload.
8. Configure a Windows Scheduled Task to run `start-bizwork.ps1` at system startup.

## Image storage

Back up `backend/data/media` and the PostgreSQL database together. The media API serves new uploads through authenticated endpoints and uses private browser caching. Do not store the only copy of product images on an ephemeral hosting filesystem.

## Multi-user and network notes

All employees use the same web address and central database. They do not each run a local copy. Concurrent spreadsheet editing still needs conflict/version handling before being treated as collaborative Google-Sheets-style editing; the current save endpoint is not a true cell-level collaboration engine.

Cloudflare Tunnel does not require opening inbound router ports, but it requires an outbound Internet connection and an eligible DNS setup. If `team.linkpc.net` is managed by a third-party dynamic-DNS provider and its DNS cannot create the required CNAME, retain that provider or use a hostname under a DNS zone you control. Do not change the live DNS until the new server passes tests.

## Security

Authentication is enabled by default. New employee accounts must be approved. Keep the admin approval flow, use HTTPS, back up the database, and do not expose PostgreSQL or Ollama directly to the public Internet.
