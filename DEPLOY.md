# Deploy SWABHIMAN

SWABHIMAN is split into separate frontend and backend applications under `marketplace/` for independent hosting on Vercel and Render:

| Setting | Render Backend | Vercel Frontend |
| --- | --- | --- |
| Repository root directory | `marketplace/backend` | `marketplace/frontend` |
| Framework/runtime | Node | Next.js |
| Build command | `npm ci && npm run build` | `npm run build` |
| Start command | `npm run db:migrate:hosted && npm start` | Managed by Vercel |
| Health check | `/api/health` | `/api/health` (rewritten to Render) |

### Render Backend (`marketplace/backend`)
1. Create a PostgreSQL database on Render.
2. Create a Web Service with Root Directory `marketplace/backend`.
3. Configure Environment Variables:
   - `DATABASE_URL`: Dedicated Postgres internal URL.
   - `APP_ORIGIN`: Exact HTTPS origin of the Vercel frontend (e.g. `https://kaamsetu.vercel.app`).
   - `DEMO_MODE`: `false` in production.
   - `VERIFICATION_WEBHOOK_SECRET`: 32-byte hex secret for worker verification callbacks.
   - `VERIFICATION_ALTERNATIVE_URL`: HTTPS URL of verification provider adapter.
   - `VERIFICATION_TRADE_URL`: HTTPS URL of trade credential adapter.

### Vercel Frontend (`marketplace/frontend`)
1. Create/import project on Vercel with Root Directory `marketplace/frontend`.
2. Configure Environment Variables:
   - `SWABHIMAN_API_ORIGIN`: The Render backend HTTPS origin (e.g. `https://swabhiman.onrender.com`).
3. Deploy frontend. The build rewrites `/api/market` and `/api/health` to `SWABHIMAN_API_ORIGIN`.

See [marketplace/README.md](marketplace/README.md#separate-hosting-on-vercel-and-render) for detailed instructions, local testing, and review queue operations.
