# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a monorepo with two independently deployed apps, each with its own `package.json`:

- `Client/` — React 18 + Vite frontend (Tailwind v4), deployed to Vercel (`Client/vercel.json` rewrites all routes to `index.html` — it's an SPA).
- `Server/` — Node/Express + MongoDB (Mongoose) REST API, deployed to Vercel as a serverless function (`Server/index.js` → `Server/server.js` → `Server/src/app.js`; `Server/vercel.json` routes everything through `index.js`).

There is no root-level `package.json` — always `cd` into `Client` or `Server` before running npm commands.

## Commands

### Client (`Client/`)
```bash
npm install
npm run dev      # Vite dev server
npm run build    # production build
```
No test suite and no `lint` npm script exist, despite an ESLint flat config being present (`Client/eslint.config.js`); run it directly with `npx eslint .` if needed.

### Server (`Server/`)
```bash
npm install
npm run dev       # nodemon server.js
npm start         # node server.js
```
No test suite exists. Requires a `.env` in `Server/` (see `Server/src/config/env.js` for the variables it reads: `PORT`, `MONGO_URI`, `JWT_SECRET`, `ENCRYPTION_KEY`, `JWT_EXPIRY`, `BCRYPT_ROUNDS`, `CORS_WHITELIST`, `DEVICE_VERIFICATION_ENABLED`).

The client's deployed axios instance (`Client/src/api/axiosInstance.js`) points at a hardcoded production API URL (`https://indiatradeoverseas-ito.onrender.com/api`), not an env var — update it there if pointing the client at a local backend.

## Server architecture

**Module pattern.** Each domain lives under `Server/src/modules/<name>/` with up to 5 files: `*.routes.js`, `*.controller.js`, `*.service.js`, `*.model.js`, plus occasional extra models (e.g. `leads` has both `lead.model.js` and `leadActivity.model.js`). Routes are wired into the app in `Server/src/app.js`, where every module is mounted twice — once under `/api/<path>` and once under `/api/v1/<path>` — so both prefixes must keep working.

**Auth is two-tiered and multi-model.** `authenticate` (`Server/src/middlewares/auth.middleware.js`) verifies a JWT and looks the subject up in `User` first, falling back to `Admin` (`modules/admin-auth/admin.model.js`) if not found — admins are a separate Mongoose model, not a `User` role. A second middleware, `authenticateDistributor`, is used for the B2B marketplace/Prakriti portal and resolves against `Distributor` first, falling back to `User`.

**Authorization has two independent layers**, often combined on the same route:
- `rbac(...roles)` (`middlewares/rbac.middleware.js`) — hard role allowlist (`ADMIN`, `MANAGER`, `SALES`, `HR`, etc.).
- `checkPermission(...permissionNames)` (`middlewares/permission.middleware.js`) — checks boolean flags either directly on the user doc (e.g. `user.leadPermission`) or via the default matrix in `rolePermissions` in that same file. `ADMIN` always passes.

When adding a protected route, decide whether it needs a role check, a permission check, or both — look at a sibling route in the same `*.routes.js` file for the local convention.

**Admin fallback router.** `Server/src/app.js` also defines a large ad-hoc `adminFallbackRouter` inline (device approval, permission toggles, dashboard aggregates, user activation, etc.) mounted at `/api/admin` and `/api/v1/admin`, instead of living in a `modules/admin/` folder. Check here before assuming an admin endpoint doesn't exist.

**Response shape.** Always respond via `Server/src/utils/response.js`'s `ok(res, data, message, statusCode, req)` / `fail(res, statusCode, errorCode, message, details, req)` — both wrap in a consistent `{ success, message, data|errorCode, meta: { requestId, timestamp } }` envelope with a per-request `req.id` (set in `app.js`) for tracing.

**Uploads** (voice notes, documents) use `multer` with disk storage under `process.cwd()/uploads/...`, created on demand per-route (see `modules/leads/lead.routes.js`) rather than a shared multer config.

## Client architecture

**Two portals in one app**, switched on in `Client/src/App.jsx` by `location.pathname`:
- Public marketing site + auth pages (`pages/public/*`) — Home, product pages (Stone, Rice, Prakriti/Tea), Careers, Contact, login/signup variants (client/employee/admin), device-pending, email verification.
- CRM portal at `/crm/*` (`pages/crm/*`), wrapped in `PortalLayout`, gated by `ProtectedRoute` / `AdminRoute` / `RoleProtectedRoute` (all defined in `App.jsx`) which read auth state from `useAuth()` (`hooks/useAuth.js` + `context/AuthContext.jsx`).

CRM sidebar/nav items are centrally defined in `Client/src/config/crmNav.js` as functions of the current user (`getCrmMainNavItems`, `getCrmAdminNavItems`, `getCrmDepartmentLinks`) — role/permission checks there must stay consistent with the server's `rolePermissions` matrix, since nothing enforces that automatically.

**Dual-token auth in the API client.** `Client/src/api/axiosInstance.js` maintains two separate tokens in `localStorage`: `token` (admin/employee/CRM) and `distributor_token` (customer/Prakriti/marketplace portal). Which one gets attached to a request is decided per-request by an `X-Portal-Context` header (`'admin'` | `'customer'`) if present, else inferred from the URL (`/prakriti` path or `/distributors/verify-otp|resend-otp|status/` endpoints). The interceptor also auto-generates and persists a `deviceHash` and force-redirects to `/login` on a 401 — except when already on `/prakriti`, `/login`, or `/signup`. When adding new distributor/marketplace API calls, set the `X-Portal-Context: 'customer'` header explicitly rather than relying on URL sniffing.

One API module per domain lives in `Client/src/api/` (`leads.js`, `payments.js`, `dispatches.js`, etc.), all built on the shared `axiosInstance`.

## Distributor marketplace pattern (Stone / Rice / Prakriti)

The public product pages that sell to B2B distributors (`pages/public/Stone.jsx`, `Rice.jsx`, `Prakriti.jsx`, plus `Careers.jsx` for its lead-capture gate) each implement the same numbered-layer access gate via a `userAccessLayer` state int, rather than separate routes: 1–2 public storefront → 3 verification/OTP login modal → 4 "under review" polling gate → 5 approved buyer marketplace. When editing one of these pages, grep for `LAYER 1`/`LAYER 3`/etc. comments to find the right section — layer numbers in comments don't necessarily match any backend concept, they're page-local UI state.

**Layer 3 is a shared component, `components/gates/BuyerEntryGate.jsx`**, not inline per-page markup — it renders for all four pages via `theme`/`division`/`requireOtp`/`onVerified`/`onComplete` props (Stone/Rice/Prakriti pass `requireOtp={true}` and get an `onVerified(distributorId, token)` callback after OTP; Careers passes `requireOtp={false}` and gets `onComplete(values)` straight after the details form). Internally it has 3 steps — `details` → `otp` (skipped when `requireOtp=false`) → `welcome`, a "Welcome, {name}!" confirmation screen — and only calls `onVerified`/`onComplete` when the user clicks Continue on the welcome screen, not the instant OTP/details succeeds. An optional `mascotSrc` prop renders a companion image (`components/gates/GateMascot.jsx`) that slides in beside the panel; currently only Rice/Stone/Prakriti/Careers pass one, all pointing at the same `Client/public/images/walking-man.png`.

**Distributor session persistence is localStorage-based and division-scoped by convention, not by code — key names must not collide.** Each page's gate handler writes its own ID key (`ito_stone_buyer_id` for Stone, `rice_distributor_id` for Rice, `prakriti_distributor_id` for Prakriti) plus a single shared `distributor_token`. These previously collided (Rice and Prakriti both used `prakriti_distributor_id`), silently cross-contaminating one division's verified status onto the other — if adding a new division gate, give it its own dedicated ID key. On mount, each page re-validates via the public `GET /distributors/status/:id` (no auth required) with a couple of retries for transient failures, and only logs the user out on a genuine 404 (distributor deleted in the CRM) — a real deletion is the only thing meant to force re-verification, matching the 365-day (effectively "until deleted") distributor JWT expiry issued in `verifyDistributorOtp`.

**`Distributor.registrationSource` (`QUICK_GATE` vs `STANDARD_KYC`, default `STANDARD_KYC`) gates whether GST/Udyam document upload is required in `registerDistributor`.** `Distributor.findOne({ email })` is division-agnostic — the same email reused across divisions, or resubmitted via "Resend code"/"Edit details" (both re-hit the same register endpoint), finds the prior record. The compliance-document bypass only applies when there's no existing record *or* the existing one is itself `QUICK_GATE` — a real pending `STANDARD_KYC` record for that email still correctly blocks the bypass, so an email with old/legacy KYC data will keep demanding documents the quick-gate UI has no field for.

**Rate cards are static data baked into the page component, not backend-driven.** e.g. `Stone.jsx` has hardcoded `PAKUR_RATES` / `BHUTAN_RATES` arrays (location × grade × payment-tier pricing) sourced from PDF rate cards. There is no admin UI or DB table for these prices — updating a rate means editing the array in the component and redeploying. If asked to update pricing, look for a `*_RATES` or similarly-named constant near the top of the relevant page file first.

**The `Proposal` model (`Server/src/modules/proposals/`) is shared across all three divisions** via a `division` enum (`TEA` / `RICE` / `STONE`) on otherwise-generic fields (`lotId`, `region`, `grade`, `quantity`, `basePrice`). Units are division-dependent but not encoded in the schema — Tea/Rice quantities are in Kg, Stone is in MT — so any UI that displays `quantity`/`basePrice` (e.g. `pages/crm/Distributors.jsx`) must branch on `division` to show the correct unit rather than hardcoding one. Minimum-order-quantity checks also live independently in each page's frontend copy and in `proposal.controller.js`'s validation — when touching either, check the other stays consistent.

**CRM `pages/crm/Distributors.jsx` has no manual distributor approve/revoke UI** — QUICK_GATE registrations auto-approve on OTP verification server-side (see `registrationSource` above), so that control was removed as dead. The only remaining admin decision on that page is per-proposal approve/disapprove (`handleUpdateProposal`), on the pending proposals expandable inside each distributor's row. The backend route/controller (`toggleDistributorVerification`) and API client method (`distributorApi.toggleVerify`) still exist but are unused by any UI — a legacy `STANDARD_KYC` record would need direct DB/API access to flip its `approvalStatus` today.

## Analytics & event tracking

Google Tag Manager (`GTM-MZKBG5Z5`, loaded in `Client/index.html`) is the only analytics integration — there's no separate `gtag.js` include, so any tag that only calls `window.gtag()` is a no-op. All tracking goes through `Client/src/utils/analytics.js`:

- `pushDataLayerEvent(event, payload)` — thin wrapper around `window.dataLayer.push`; use it for any one-off named event.
- `initActivityTracking()` — mounted once in `App.jsx`'s `AppLayout`, attaches delegated site-wide listeners that auto-fire `site_click` (any button/link/`[class*="cursor-pointer"]` element), `site_form_submit` (any form), and `site_input_change` (any select/checkbox/radio/file input). This already covers every interactive element on the site, so most new UI needs no tracking code of its own. Field *values* are never sent (only names/ids — passwords, OTPs, filenames stay out of dataLayer), and there's a guard against `<label><input type="file"></label>` patterns double-firing a click.
- `virtual_page_view` fires per-route from the same `AppLayout` effect, since SPA route changes don't trigger GTM's default pageview trigger.

**Named conversion events** layer on top of the generic ones at actual success points (OTP verified, sourcing proposal submitted, Razorpay payment verified, lead form/signup/login success) — convention is `<division>_distributor_verified` / `<division>_proposal_submitted` / `<division>_payment_success` for Stone/Rice/Prakriti(Tea), and GA4-recommended names (`generate_lead`, `sign_up`, `login`) elsewhere. When adding a new success path on one of these pages or auth/lead forms, add a matching `pushDataLayerEvent` call rather than relying on the generic click tracker alone — ad/conversion reporting is built on these named events, not the generic ones. `BuyerEntryGate` itself fires `entry_gate_details_submitted` and `entry_gate_otp_verified` (the latter at the moment OTP succeeds, deliberately *before* the welcome screen's Continue click) — the host page's own `<division>_distributor_verified`/`careers_gate_completed` still fires separately, only once Continue is clicked.

## Git workflow note

This repo's history shows feature work landing on a long-lived `feat/homepage-v2` branch via many small PRs merged into `main`, rather than direct pushes to `main`. Follow that pattern unless told otherwise.
