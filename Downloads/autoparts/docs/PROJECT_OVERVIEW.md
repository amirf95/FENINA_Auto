# Fenina Autoparts — Project Overview & Progress

Last updated: 2026-09-30

## 1. What this project is

An auto-parts business management system with three parts:
- **Django REST API backend** — staff auth, clients, inventory/stock, invoices, payments, reminders. The single source of truth both frontends talk to.
- **Admin dashboard** (React/Vite) — internal tool for staff to manage stock, clients, and billing.
- **Customer storefront** (React/Vite/TS) — public marketing site with a vehicle finder and chatbot; no ordering/checkout flow yet.

## 2. Repository structure

```
autoparts/
├── admin/                              React admin dashboard (Vite + JSX)
│   ├── src/
│   │   ├── components/                 Stock.jsx, PartEditor.jsx, BarcodeScannerModal.jsx, ...
│   │   ├── hooks/useApiClient.js       JWT auth + fetch helpers (auto-refresh on 401)
│   │   └── lib/api.js
│   └── fenina-api/fenina-api/          Django backend (nested dir — slightly awkward naming, harmless)
│       ├── manage.py, requirements.txt, .env / .env.example
│       ├── fenina_api/                 settings, urls, chatbot.py (Anthropic proxy)
│       ├── accounts/                   staff auth (JWT, roles: owner/manager/employee)
│       ├── catalog/                    clients + inventory (Part, StockMovement) — the core of this doc
│       ├── billing/                    invoices, payments, reminders, dashboard stats
│       └── vehicles/                   static car brand/model lookup data
├── fenina-storefront/                  Public marketing site (Vite + React + TS)
└── automations/
    └── n8n-nouvelle-piece-scan.json    n8n "scan to add part" workflow (see §6)
```

No CLAUDE.md exists in the repo. Backend has its own `README.md` (mostly accurate, one stale line noted below).

## 3. Backend module status (from the full audit)

| Module | Status |
|---|---|
| accounts (auth) | Functional — JWT login/refresh/me, role-based |
| catalog (clients + inventory) | Most mature module — full CRUD, real stock-adjustment logic, client audit log |
| billing (invoices/payments/reminders) | Full CRUD, invoice status computed from payments (never set by hand), stock auto-synced to invoice lifecycle |
| vehicles | Small, complete for its narrow purpose (static reference data) |
| chatbot (fenina_api/chatbot.py) | Functional server-side Anthropic proxy, rate-throttled |
| admin frontend | Fully wired to the live API (backend README's claim that it "uses in-memory sample data" is **stale/wrong**) |
| storefront | Marketing site + vehicle finder + chatbot; **no cart/checkout/ordering** |

**Known gaps** (unchanged since the audit, not yet addressed):
- Zero automated tests in any Django app.
- `adjust_stock()` doesn't guard against quantity going negative.
- `admin/api.py` (Claude-Vision OCR invoice importer) last run failed on all 317 test images — separate utility script, not part of the main app.

## 4. Key decisions made together (so future-me doesn't re-litigate these)

- **`Part.id` stays a plain integer (`BigAutoField`)** — user considered a UUID PK but chose to keep the integer id after learning it would touch `StockMovement`/`InvoiceLine` FK columns in `billing` for no functional benefit.
- **`cost` renamed to `priceht`** (same concept: purchase price, tax-excluded/HT). Django's auto-generated migration would have done this as `RemoveField` + `AddField`, silently losing every existing part's cost — caught and replaced with a hand-written `RenameField` migration instead.
- **`barcode` vs `qr_code` are separate fields.** `barcode` is UPC/EAN-shaped and eligible for external product-database lookup (UPCitemdb). `qr_code` can hold arbitrary text/URLs and is internal-match-only — no external database applies to arbitrary QR content.

## 5. Feature: barcode & QR autofill on the "add part" form

### Backend
- `catalog/models.py` — `Part` gained: `oem`, `barcode` (unique, nullable), `qr_code` (unique, nullable), `specs` (JSONField), `location`; `cost` → `priceht`.
- Migrations: `catalog/migrations/0004_part_barcode_fields.py`, `0005_part_qr_code.py` — both applied and verified against the dev DB.
- `catalog/barcode.py` (new) — `lookup_external(barcode)`: calls UPCitemdb's **free trial tier** by default (100 lookups/day, no signup). Set `UPCITEMDB_API_KEY` in `.env` to switch to a paid tier with zero code changes.
- `catalog/views.py` — `PartViewSet.lookup_barcode` (`GET /api/parts/lookup-barcode/?barcode=`): internal DB match first, external fallback second. `PartViewSet.lookup_qrcode` (`GET /api/parts/lookup-qrcode/?qr_code=`): internal match only.
- Both endpoints require staff auth (`IsAuthenticated`, same as the rest of the API) and were verified live over HTTP (internal match, external match against a real-world UPC, no-match case, 401-without-token).

### Frontend (`admin/src`)
- `components/PartEditor.jsx` — new inputs (OEM, barcode, QR code, location, a simple key/value specs editor); barcode/QR fields auto-lookup on blur or Enter (works with physical HID scanners for free — they just "type" into the field); internal match offers a "load this part" action instead of silently overwriting the form; external match fills only empty fields and flags them as "to verify."
- `components/BarcodeScannerModal.jsx` (new) — live camera decoding via `@zxing/browser` (works cross-browser, unlike the Chromium-only native `BarcodeDetector` API), reusable for both barcode and QR targets. **Lazy-loaded** (`React.lazy`) since it's a sizeable dependency only needed when the camera button is actually clicked.
- `App.jsx` — passes the authenticated `call` helper down into `PartEditor`.

### How barcode scanning works, for reference
Physical USB/Bluetooth barcode scanners act as **HID keyboard-emulation devices** — they "type" the barcode + Enter into whatever text field has focus. No drivers, no integration needed; this is why the barcode/QR input fields already support them with zero extra code. Camera-based scanning (the modal above) is the alternative for when there's no physical scanner handy.

## 6. Feature: n8n "scan to add part" automation

File: **`automations/n8n-nouvelle-piece-scan.json`** — an importable n8n workflow.

**Flow**: Form Trigger (barcode input) → calls the backend's own `lookup-barcode` endpoint (reusing all the logic above, not duplicating it) → a second form page shows whatever it found (name/brand/category), pre-filled, plus a warning banner if the part already exists, plus empty inputs for what can never be auto-filled (price, priceht, quantity, location, OEM) → on submit, creates the part via `POST /api/parts/`.

**Setup required before it works (not yet done as of this writing):**
1. Create a dedicated `automation@fenina.local` `StaffUser` account in Django (least-privilege `employee` role) — exact shell command was given in chat.
2. n8n Cloud can't reach `localhost` — expose the local Django API via **ngrok** (`ngrok http 8000`) or Cloudflare Tunnel. Free ngrok URLs change on every restart; a static domain (paid ngrok, or Cloudflare Tunnel with an owned domain) is worth it for regular use.
3. **Add the tunnel host to `ALLOWED_HOSTS`** in the backend `.env` — Django will otherwise reject every request with `DisallowedHost`. This is the gotcha most likely to bite first.
4. Import the JSON into n8n Cloud, open the **Config** node, fill in `apiBase` (tunnel URL, no trailing slash), `email`, `password`.
5. Click **Activate**, then use the **Scanner le code-barres** node's production URL as the reusable "add a part" link.

**Caveats flagged at build time:**
- Whether a Form node field's "Default value" accepts `{{ }}` expressions wasn't 100% confirmed from n8n's docs (only inferred from n8n's general parameter conventions) — verify visually after import that step-2 fields actually pre-fill.
- If `POST /api/parts/` fails (e.g. duplicate SKU), the user currently just sees n8n's generic error page, not a friendly retry.
- Credentials sit in plain text in the workflow's Config node for simplicity — fine for a single-user internal tool, worth moving to n8n Credentials if that matters later.
- This flow doesn't set `specs` — add those afterward in the admin dashboard if needed.

## 7. Progress tracker

- [x] Backend/frontend architecture fully audited
- [x] `Part` model extended (oem, barcode, qr_code, specs, location, priceht) + migrated
- [x] Barcode lookup endpoint (internal + external via UPCitemdb)
- [x] QR lookup endpoint (internal only)
- [x] Admin form wired to both lookups, with physical-scanner support
- [x] Camera-based barcode/QR scanner (lazy-loaded)
- [x] n8n workflow JSON built
- [ ] Automation `StaffUser` account created in Django
- [ ] Tunnel (ngrok/Cloudflare) set up + `ALLOWED_HOSTS` updated
- [ ] n8n workflow imported, configured, activated, tested end-to-end
- [ ] *(optional, not started)* Negative-stock guard on `adjust_stock`
- [ ] *(optional, not started)* Automated backend tests
- [ ] *(optional, not started)* Storefront cart/checkout flow
- [ ] *(optional, not started)* Fix the broken OCR batch-import script (`admin/api.py`)
