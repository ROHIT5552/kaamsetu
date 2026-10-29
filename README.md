# KaamSetu (कामसेतू)

> **Production Full-Stack Marketplace for Verified Local Skilled Workers in Aurangabad (Chhatrapati Sambhajinagar)**

Built with Next.js 14 (App Router, TypeScript), Tailwind CSS, Three.js 3D isometric scenes, next-intl (English & Marathi), Zustand, Express.js API, Prisma ORM, and PostgreSQL.

---

## Key Features

- **Pixel-Accurate Prototype Fidelity**: Preserves all visual design, brand colors (`--yel: #ffc21a`, `--ink: #14232b`, `--blue: #1d4e89`), striped tape motifs, `Baloo 2` & `Hind` typography, and light/dark theme tokens.
- **Client-Only 3D Visuals (`three@0.128`)**:
  - `HeroScene`: Low-poly 3D isometric city hub of Aurangabad with floating interactive artisan tools, respecting `prefers-reduced-motion` and pausing when off-screen or tab is hidden.
  - `TrackScene`: Real-time 3D city grid with live worker GPS streaming over Server-Sent Events (SSE) and realistic simulation fallback.
- **Enterprise-Grade Authentication**:
  - Phone and Email OTP authentication with SHA-256 cryptographic hashing.
  - SMS via MSG91 (DLT template ready) & Email via Resend (with development console loggers).
  - 10-minute expiry, 30s resend cooldown, max 5 attempts, and rate limiting.
  - Short-lived JWT access tokens (15m) + rotating refresh tokens in `httpOnly`, `Secure`, `SameSite=Lax` cookies.
  - Contact privacy protection: Worker phone numbers and direct "Call" triggers are restricted to authenticated users.
- **Bilingual Internationalization**: Complete English (`en`) and Marathi (`mr`) language support via `next-intl`.
- **Double-Booking Prevention**: Server-enforced slot reservations ensuring workers cannot be double-booked for the same time slot and date.
- **SEO & Performance**:
  - Server-Side Rendering (SSR) for worker catalogs.
  - Search queries synced directly to URL search parameters.
  - JSON-LD LocalBusiness & Marketplace Schema.
  - Automatic `sitemap.xml` and `robots.txt`.
- **Robust Monorepo Architecture**:
  - `/web`: Next.js 14 App Router frontend.
  - `/server`: Node.js Express TypeScript API with Prisma ORM.
  - `/shared`: Shared Zod validation schemas, constants, and TypeScript types.
  - Docker Compose for PostgreSQL.

---

## Monorepo Structure

```
kaamsetu/
├── docker-compose.yml          # PostgreSQL service container
├── render.yaml                 # Render Blueprint (Web service + Managed Postgres)
├── vercel.json                 # Vercel deployment with API proxy rewrites
├── DEPLOY.md                   # Complete deployment checklist and verification guide
├── README.md                   # Documentation and run steps
├── shared/                     # Shared Zod schemas and TypeScript types
│   └── src/
├── server/                     # Express.js REST API with Prisma ORM
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.ts             # 12 sample workers, photos, reviews, and admin seed
│   └── src/
└── web/                        # Next.js 14 App Router frontend
    ├── messages/               # Bilingual dictionaries (en.json, mr.json)
    └── src/
        ├── app/                # App Router pages ([locale], join, account, admin, etc.)
        └── components/         # Header, HeroScene, TrackScene, WorkerCard, WhyBento, etc.
```

---

## Environment Variables

### Vercel (`/web/.env.example`)

```env
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_DEFAULT_LOCALE=
```

### Render (`/server/.env.example`)

```env
DATABASE_URL=
WEB_ORIGIN=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
COOKIE_DOMAIN=
MSG91_AUTH_KEY=
MSG91_TEMPLATE_ID=
RESEND_API_KEY=
MAIL_FROM=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
ADMIN_EMAIL=
ADMIN_PHONE=
```

---

## Local Development Setup

### 1. Prerequisites
- Node.js v18+ or v20+
- PostgreSQL running locally or via Docker Compose (`docker compose up -d`)

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Database & Seed
```bash
cd server
npm run prisma:generate
npm run prisma:migrate
npm run seed
cd ..
```

The seed script will populate:
- 12 verified sample workers across Garkheda, Osmanpura, Jalna Road, CIDCO N-3, Waluj, Beed Bypass, etc.
- Authentic work photos for all 5 skills (plumber, electrician, carpenter, painter, mason, helper).
- Verified customer reviews and ratings.
- The system administrator account using `ADMIN_EMAIL` and `ADMIN_PHONE` from your environment.
- Safe sample phone numbers (`9000000001` - `9000000012`) for demo workers.

### 4. Run Development Servers
```bash
npm run dev
```

- **Frontend**: [http://localhost:3000/en](http://localhost:3000/en) (or `/mr`)
- **Backend API**: [http://localhost:5000/api](http://localhost:5000/api)
- **Healthcheck**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## Testing

Run unit and integration tests across all packages:

```bash
# Run Vitest for Zod schemas, OTP hashing, and Supertest API endpoints
npm run test --workspace=server
```

Run Playwright end-to-end browser tests:
```bash
npx playwright test
```

---

## Render Free Tier Keep-Alive Note

Render's free tier web services automatically spin down after 15 minutes of inactivity. For live client presentations:
1. Configure an external health monitor (e.g., [UptimeRobot](https://uptimerobot.com) or [Cron-Job.org](https://cron-job.org)) to ping `https://kaamsetu-api.onrender.com/api/health` every 10 minutes.
2. Alternatively, upgrade to Render's **Starter** plan ($7/month) for continuous zero-latency operation.

---

## License

MIT © 2026 KaamSetu Technologies.
