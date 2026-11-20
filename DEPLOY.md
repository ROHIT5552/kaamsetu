# Deploy SWABHIMAN

Use marketplace as the project root for deployments from this branch. It contains both the Next.js frontend and the API.

| Setting | Vercel | Render Node Web Service |
| --- | --- | --- |
| Root directory | marketplace | marketplace |
| Build command | npm run build | npm ci && npm run build |
| Start command | Managed by Vercel | node scripts/migrate.mjs && npm exec -- next start --hostname 0.0.0.0 |
| Health check | /api/health | /api/health |

Configure DATABASE_URL with a dedicated PostgreSQL connection string. Use Render's internal database URL for a service in the same Render workspace and region. Use an external connection string on Vercel. Set APP_ORIGIN to the exact HTTPS origin users open and DEMO_MODE=false. Run the database migrations against the hosted database before serving traffic. The Render start command above runs them for a single instance. Keep database credentials and verification secrets in host environment settings.

Check that /api/health returns HTTP 200 with {"ok":true}, then test sign-in through the public app URL. See the [marketplace guide](marketplace/README.md) for verification setup.

The separate frontend/backend deployment roots belong to the split-deployments branch. Change hosting roots when that branch is merged and ready for cutover.