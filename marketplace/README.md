# SWABHIMAN

SWABHIMAN is a local trades marketplace for Chhatrapati Sambhajinagar. Employers publish scoped work, and workers list their services and rates. Both sides can negotiate a total price, exchange messages and follow the booking through arrival and completion. The interface supports English, Marathi and Hindi. User-entered descriptions and messages appear in their original language.

## Run locally

Use Node.js 22 or later and PostgreSQL 16 or later. In marketplace/backend, copy .env.example to .env.local and set DATABASE_URL for a dedicated local database. APP_ORIGIN is the browser-facing frontend origin, normally http://localhost:3000. To try the seeded demo, set DEMO_MODE=true in this local file.

In the backend terminal:

```powershell
cd marketplace/backend
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

Run the seed command only in localhost demo mode. The API listens on port 3001. In another terminal:

```powershell
cd marketplace/frontend
npm ci
npm run dev
```

Open http://localhost:3000. The frontend proxies /api/market and /api/health to the local backend. Use the same demo room in two separate browser profiles to try both roles. Run npm run test:smoke from marketplace/backend while both apps are running.

## Seeded demo accounts

Use Sign in at localhost and enter one of the accounts below after running npm run db:seed. They are fixture accounts used only with DEMO_MODE=true. The seed command requires a localhost origin.

| Role | Email | Password |
| --- | --- | --- |
| Employer | sample-employer@demo.invalid | HireDemo!2026 |
| Plumbing worker | sample0@demo.invalid | TradeDemo!2026 |
| Electrical worker | sample1@demo.invalid | ElectricDemo!2026 |

The seed provides 10 open jobs, 20 worker profiles, and six written reviews associated with completed bookings. In discovery, use the bookmark icon to save active listings to your account. In the inbox, unread badges clear when you open and read the conversation. An employer can add one public review to each completed booking. Listings show up to three recent written reviews with trade and score.

## Try both sides

1. Enter as a worker, save a profile with a category, and request identity verification. For Electrical, request the electrical credential as well. The local demo records these as simulated checks.
2. Enter as the employer in another browser profile. Post a future job in the worker's category with a budget and duration.
3. The worker sends an offer, or the employer invites an available worker from search using a matching open job. The employer can reply, accept it, or make a counteroffer. With a counteroffer, the worker must accept the new version.
4. The worker marks the booking On the way and can explicitly share browser location. The employer sees recent updates in the booking conversation and can open the point in a map. The worker marks arrival, then the employer starts and completes the work.

## Manage jobs and bookings

Employers can open My jobs to edit a listing before its first offer, close an open listing, review incoming offers, or open its booking. Closing a listing removes it from discovery and declines pending offers in one transaction. Editing locks after the first offer so workers can rely on the scope they quoted.

The booking inbox shows dated milestones from confirmation through completion. An employer can rate the worker once after completion. Discovery shows the average rating and lets visitors compare prices, ratings and approximate distance when location is available.

## Architecture

- Next.js App Router serves the responsive marketplace. The Node.js route handler owns validation, sessions, permissions and transactions. PostgreSQL backs profiles, jobs, conversations, offers, bookings, verification requests and rate limits.
- The frontend calls /api/market on its own origin. The frontend rewrites that path to the Render backend, where session and origin checks run. GET returns public discovery and authenticated participant views. POST uses a validated action and payload. Queries are parameterized and private responses use no-store.
- A single transaction locks the job before its application and booking. One accepted offer creates one booking and declines competing offers. Offer versions prevent stale or self-acceptance, and the history records each offer. Monetary amounts are integer paise. No exchange of funds occurs within the app.
- Public matching combines trade, locality, search and optional straight-line distance. Rounded discovery coordinates support approximate ordering. Exact booking coordinates are participant-only, visible for up to 60 seconds, overwritten on updates and cleared on arrival, cancellation or explicit stop. Browser background suspension can interrupt sharing.
- Booking rules are role-specific. Workers mark departure and arrival, while employers mark work started and completed. Either participant can cancel before arrival or flag a dispute afterward. Booking changes are recorded, and dispute resolution currently requires a future operations workflow.
- Passwords are salted with scrypt. Session secrets are random, stored as hashes and sent through HttpOnly SameSite cookies. Mutations check Origin, schema, role and ownership. Authentication and writes have database-backed rate limits.

## Separate hosting on Vercel and Render

Deploy the backend first and use its HTTPS origin when configuring the frontend. Both apps are independently installable and have their own lockfiles.

| Setting | Render backend | Vercel frontend |
| --- | --- | --- |
| Repository root directory | marketplace/backend | marketplace/frontend |
| Framework/runtime | Node | Next.js |
| Build command | npm ci && npm run build | npm run build |
| Start command | npm run db:migrate:hosted && npm start | Managed by Vercel |
| Health check | /api/health | /api/health, forwarded to Render |

- Render: configure DATABASE_URL with the dedicated Postgres internal URL, APP_ORIGIN with the exact HTTPS origin of the Vercel frontend (without a trailing slash), and DEMO_MODE=false. Keep the database in the same workspace and region as the backend. Render supplies PORT. The start command above runs idempotent migrations for a single instance. For multiple instances, run migrations once during release and use npm start for the service.
- Vercel: set SWABHIMAN_API_ORIGIN to the backend HTTPS origin, such as https://swabhiman.onrender.com, and redeploy. The build reads this setting to create same-origin rewrites. Set it in each deployment environment you intend to use. Do not copy DATABASE_URL or verification secrets to the frontend.
- If the frontend uses a preview URL, use a test backend with APP_ORIGIN matching that preview and a test database. Each backend accepts writes from one configured frontend origin.
- Verify /api/health on both URLs, then sign in using the Vercel domain to verify origin checks and session cookies. Provider callbacks go directly to the Render backend at /api/verification/provider.
- To migrate existing deployments, update Render's Root Directory and commands first. Verify its health, then update Vercel's Root Directory and redeploy the frontend. The legacy repository-level Vercel and Render configurations are for the older KaamSetu stack.

## Production boundaries

Production checks use the hosted verification workflow and reviewer queue below. Existing pre-integration requests are not treated as approvals. They can be resubmitted from the worker profile. Verify identity for all workers and provide an alternative to Aadhaar. The project collects consent and records a check request. It has no fields for Aadhaar or PAN numbers, scans or biometrics. Follow [UIDAI offline verification guidance](https://www.uidai.gov.in/images/FAQ_OVSE.pdf) when selecting the actual workflow.

Before public launch, configure and validate a live verification adapter and its deletion process. Protect reviewer access with MFA or an identity-aware gateway covering both the page and API. Add account recovery and email verification or mobile OTP, configure HTTPS and PostgreSQL backups, and review monitoring, retention and abuse handling. Demo mode must be disabled. Escrow, UPI collection, tax receipts, WhatsApp dispatch, voice workflows, multi-day contracts, background tracking and payment disputes are outside this implementation.
## Worker verification and review

From marketplace/backend, run npm run db:migrate before starting the updated backend. Production verification is separate from the localhost demo. Production approvals require a signed provider result and a reviewer decision. The demo continues to use simulated results and cannot access the production callback or review queue.

Configure VERIFICATION_ALTERNATIVE_URL and VERIFICATION_TRADE_URL with HTTPS entry points to your approved hosted verification adapter. Add VERIFICATION_AADHAAR_URL only after confirming the legal and provider arrangement for the Aadhaar flow. SWABHIMAN offers Aadhaar only when the alternative ID route is configured. The organization operating the actual identity check must validate the document, bind the result to the person who completed the provider journey, document which government IDs are supported, handle local-language notices, and implement consent withdrawal and deletion. For electrical trade checks, confirm the issuer, matching holder, trade scope and expiry. The app requires electrical credentials for the electrical category.

Generate a 32-byte random hex VERIFICATION_WEBHOOK_SECRET. Keep it in deployment secret storage and share it with the adapter over a secure channel. Use separate keys for development and production. Treat launch query parameters as sensitive and prevent gateway logs and third-party analytics from recording them.

### Adapter contract

- SWABHIMAN opens the configured URL with case, method, expires and token query parameters. The adapter must validate the hex HMAC-SHA-256 token over the UTF-8 string launch.case.method.expires, reject expired links, and associate the verified journey with that case and method. The hex secret is decoded to 32 bytes before HMAC. The adapter should permit a worker to resume an unfinished case without allowing a completed case to be reassigned.
- The adapter POSTs to /api/verification/provider with Content-Type application/json, x-ks-timestamp as Unix seconds, and x-ks-signature as lowercase hex HMAC-SHA-256 over the UTF-8 timestamp plus a period and the exact raw request body. Sign each retry with a fresh timestamp. The server accepts a five-minute clock window.
- JSON fields are caseId (UUID), evidenceRef (unique opaque UUID), method (aadhaar, alternative or trade), result (passed or failed), and validUntil (UTC ISO 8601 string or null). A passed trade check requires a future expiry. An exact callback retry is idempotent. A withdrawn case returns HTTP 410. Do not send document numbers, images, names, addresses or biometric information.
- The adapter must handle provider-side retention and deletion separately. Worker withdrawal in SWABHIMAN immediately disables the approval and clears its stored evidence reference, result and expiry. A minimal decision audit remains. Establish the provider-side deletion and acknowledgement procedure before onboarding real workers.

### Staff access

Create a dedicated non-demo employer account for each reviewer and confirm control of that account out of band. Retrieve the account UUID from the database. From a privileged operations shell, run npm run verification:reviewer -- grant ACCOUNT_UUID. Use revoke in place of grant to remove access. Revoke takes effect on the next request.

Sign in and open Verification review. Filter cases by status, inspect the result and use the opaque reference in your provider dashboard if needed. Approve a passing unexpired result, reject with a reason, or revoke an existing approval. Reviewer actions are audited. Reviewer access requires signing in within the last 15 minutes. Production use still requires the external MFA controls described above.

SWABHIMAN provides the adapter contract and a tested local signed-callback flow. The project does not include a live provider account or an approved Aadhaar operating arrangement.

### Test the review queue without live identity documents

Use a separate local database and set DEMO_MODE=false, KS_VERIFICATION_TEST=true and APP_ORIGIN=http://localhost:3000. Set VERIFICATION_CALLBACK_ORIGIN=http://127.0.0.1:3001 in the backend local environment. Set the alternative and trade URLs to HTTPS example.invalid placeholders and generate a throwaway webhook secret with node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))". Run npm run db:migrate and start both apps.

Run npm run test:verification for the automated path. To exercise the admin UI manually, create an employer account and grant it reviewer access using its database UUID. In a separate browser profile create a worker, request a check, and copy the case UUID from the verification link's case query parameter. Simulate a result with npm run verification:fixture -- CASE_UUID alternative passed, then open Verification review from the employer account and approve it. Use trade to exercise the electrical flow. The fixture does not open or contact the placeholder provider.
