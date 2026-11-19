# SWABHIMAN

SWABHIMAN is a local trades marketplace for Chhatrapati Sambhajinagar. Employers publish scoped work, and workers list their services and rates. Both sides can negotiate a total price, exchange messages and follow the booking through arrival and completion. The interface supports English, Marathi and Hindi. User-entered descriptions and messages appear in their original language.

## Run locally

Use Node.js 22 or later and PostgreSQL 16 or later. Create an empty database and a PostgreSQL role for the project. Copy .env.example to .env.local, set DATABASE_URL to your database credentials and keep APP_ORIGIN at http://localhost:3000 for the local commands.

```powershell
npm ci
npm run db:migrate
npm run dev
```

Open http://localhost:3000. For the demo, set DEMO_MODE=true before starting the server and run npm run db:seed after migrating. Use the same demo room in two independent browser profiles. Demo accounts are shared by room name and anyone who knows the name can enter. Use sample data only and keep the server bound to localhost.

To run a production build locally, use npm run build and npm start. If a local database is already configured, keep its PostgreSQL service running when starting the app. The smoke test runs with npm run test:smoke against the local demo and creates sample records.

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
- The marketplace API lives at /api/market. GET returns public discovery and authenticated participant views. POST uses a validated action and payload. Queries are parameterized and private responses use no-store.
- A single transaction locks the job before its application and booking. One accepted offer creates one booking and declines competing offers. Offer versions prevent stale or self-acceptance, and the history records each offer. Monetary amounts are integer paise. No exchange of funds occurs within the app.
- Public matching combines trade, locality, search and optional straight-line distance. Rounded discovery coordinates support approximate ordering. Exact booking coordinates are participant-only, visible for up to 60 seconds, overwritten on updates and cleared on arrival, cancellation or explicit stop. Browser background suspension can interrupt sharing.
- Booking rules are role-specific. Workers mark departure and arrival, while employers mark work started and completed. Either participant can cancel before arrival or flag a dispute afterward. Booking changes are recorded, and dispute resolution currently requires a future operations workflow.
- Passwords are salted with scrypt. Session secrets are random, stored as hashes and sent through HttpOnly SameSite cookies. Mutations check Origin, schema, role and ownership. Authentication and writes have database-backed rate limits.

## Hosting the standalone app

In the GitHub repository, use marketplace as the service root. For a Render Node web service, use npm ci && npm run build as the build command. Run node scripts/migrate.mjs against the new database before first launch. For a single test instance, the start command can be node scripts/migrate.mjs && npm exec -- next start --hostname 0.0.0.0. Use /api/health for the health check. On a multi-instance deployment, apply migrations once through the release process before starting instances.

Set DATABASE_URL using the host's secret environment settings and APP_ORIGIN to the exact HTTPS service origin. Set DEMO_MODE=false. Set the verification adapter URLs and signing key through secret configuration as applicable. Keep database access private and run the health check after deploying. Do not run the local demo seed against a public database.

## Production boundaries

Production checks use the hosted verification workflow and reviewer queue below. Existing pre-integration requests are not treated as approvals. They can be resubmitted from the worker profile. Verify identity for all workers and provide an alternative to Aadhaar. The project collects consent and records a check request. It has no fields for Aadhaar or PAN numbers, scans or biometrics. Follow [UIDAI offline verification guidance](https://www.uidai.gov.in/images/FAQ_OVSE.pdf) when selecting the actual workflow.

Before public launch, configure and validate a live verification adapter and its deletion process. Protect reviewer access with MFA or an identity-aware gateway covering both the page and API. Add account recovery and email verification or mobile OTP, configure HTTPS and PostgreSQL backups, and review monitoring, retention and abuse handling. Demo mode must be disabled. Escrow, UPI collection, tax receipts, WhatsApp dispatch, voice workflows, multi-day contracts, background tracking and payment disputes are outside this implementation.
## Worker verification and review

Run npm run db:migrate before starting the updated app. Production verification is separate from the localhost demo. Production approvals require a signed provider result and a reviewer decision. The demo continues to use simulated results and cannot access the production callback or review queue.

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

Use a separate local database and set DEMO_MODE=false, KS_VERIFICATION_TEST=true and APP_ORIGIN=http://localhost:3000. Set the alternative and trade URLs to HTTPS example.invalid placeholders and generate a throwaway webhook secret with node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))". Run npm run db:migrate and start the app.

Run npm run test:verification for the automated path. To exercise the admin UI manually, create an employer account and grant it reviewer access using its database UUID. In a separate browser profile create a worker, request a check, and copy the case UUID from the verification link's case query parameter. Simulate a result with npm run verification:fixture -- CASE_UUID alternative passed, then open Verification review from the employer account and approve it. Use trade to exercise the electrical flow. The fixture does not open or contact the placeholder provider.
