# KaamSetu (कामसेतू) – Hyper-Local Work Marketplace & Admin Ops

KaamSetu is an on-demand hyper-local marketplace platform connecting households and businesses with verified skilled workers (plumbers, electricians, carpenters, painters, masons, and general helpers) across **Chhatrapati Sambhajinagar (Aurangabad)**.

Built with a modern, high-contrast **White & Yellow theme** (`#ffc21a`, `#f59e0b`, `#ffffff`, `#fffdf5`), full bilingual localization in **Marathi (मराठी)** and **English**, vernacular voice synthesis, cost estimation wizard, UPI QR tax invoices, live route simulation, and a full admin operations ledger.

---

## 📁 Repository Structure

The project maintains independent deployment root directories so existing **Vercel** and **Render** services deploy seamlessly without changing root settings:

```
kaamsetu/
├── marketplace/
│   ├── frontend/               # Next.js App Router UI (Vercel deployment root)
│   │   ├── app/
│   │   │   ├── layout.js       # App shell, PWA metadata & Google Fonts
│   │   │   ├── page.js         # Entry page rendering KaamSetuApp
│   │   │   ├── kaamsetu-app.js # Transformed full Next.js interactive marketplace
│   │   │   └── style.css       # Tailwind CSS & print styles
│   │   ├── lib/
│   │   │   └── kaamsetu-data.js# Trades, localities, diagnostic issues, seed workers & i18n
│   │   ├── public/             # Icons, manifest.json, service worker & standalone.html
│   │   ├── tailwind.config.js  # White & Yellow theme brand palette
│   │   └── next.config.mjs     # API rewrites & security headers
│   │
│   └── backend/                # Next.js Node API & PostgreSQL (Render deployment root)
│       ├── app/api/
│       │   ├── health/route.js # Health check (/api/health)
│       │   ├── market/route.js # Marketplace data & live listings (/api/market)
│       │   └── verification/   # Worker KYC review provider adapters
│       ├── db/                 # PostgreSQL schema migrations & seeds
│       └── scripts/            # Database migration, seed & test scripts
│
├── backend_fastapi_reference/  # Original Python FastAPI backend & Alembic models
├── DEPLOY.md                   # Cloud deployment guide for Vercel & Render
└── README.md                   # Project documentation & start commands
```

---

## 🚀 All Project Start Commands

### 1. Prerequisites
- **Node.js**: v18.x or later (recommended v20+ or v24)
- **npm**: v9+ (On Windows PowerShell, use `npm.cmd` if script execution policy restricts `npm.ps1`)

---

### 2. Frontend Local Development (`marketplace/frontend`)

```powershell
# Navigate to the frontend directory
cd marketplace/frontend

# Install dependencies (first time only)
npm.cmd install

# Start local Next.js development server
npm.cmd run dev
```
> The frontend will start at **http://localhost:3000**.
> When running locally, Next.js rewrites `/api/*` requests to the local backend on port `3001`.

#### Frontend Production Build & Start:
```powershell
# Build optimized production bundle
npm.cmd run build

# Start production server
npm.cmd start
```

---

### 3. Backend Local Development (`marketplace/backend`)

```powershell
# Navigate to the backend directory
cd marketplace/backend

# Install dependencies (first time only)
npm.cmd install

# Run database migrations against your Neon PostgreSQL database
npm.cmd run db:migrate

# Seed database with initial verified local workers & sample jobs
npm.cmd run db:seed

# Start backend API server on port 3001
npm.cmd run dev
```
> The backend server will listen at **http://127.0.0.1:3001**.
> Health check is accessible at `http://127.0.0.1:3001/api/health`.

#### Backend Production Build & Start (Used on Render):
```powershell
# Build backend
npm.cmd run build

# Start production server listening on 0.0.0.0 for Render
npm.cmd start
```

---

### 4. Database Helper Commands (`marketplace/backend`)

```powershell
cd marketplace/backend

# Apply schema migrations
npm.cmd run db:migrate

# Seed 26+ verified worker profiles and job listings
npm.cmd run db:seed

# Run smoke tests
npm.cmd run test:smoke

# Run verification reviewer tests
npm.cmd run test:verification
```

---

### 5. Standalone Zero-Build Browser Launch
If you want to run the standalone zero-dependency version directly:
```powershell
# Serve the public directory with any static server
npx serve marketplace/frontend/public
# Or open marketplace/frontend/public/standalone.html in any browser
```

---

## 🎨 Theme: Modern White & Sunny Yellow

The platform uses a warm, high-contrast white and yellow theme:
- **Primary Brand Yellow**: `#ffc21a` (KaamSetu Yellow)
- **Warm Ambers & Accents**: `#f59e0b`, `#fbbf24`, `#d97706`
- **Backgrounds**: Pure Crisp White (`#ffffff`), Warm Ivory (`#fffdf5`), Cream (`#fffbeb`, `#fef3c7`)
- **Text**: High contrast Slate (`#0f172a`, `#1e293b`, `#334155`)
- **Badges & Cards**: Pure white card surfaces with amber borders (`border-amber-200`) and soft shadows.

---

## 🌟 Key Application Features

1. **Smart Job Diagnostic & Cost Estimator Wizard**:
   - Interactive wizard covering 18+ home repair issues across all trades.
   - Normal vs. 15-Minute Emergency dispatch calculator.
   - Estimates work duration, labor cost, and spare parts fees with 1-click booking pre-fill.
2. **Vernacular Audio Voice Reader (Web Speech API)**:
   - 1-Click voice assistant reading worker profiles in **मराठी (Marathi)** and **English**.
3. **Saved Favorites (Bookmark List)**:
   - Heart toggle to save preferred technicians with persistent `localStorage` syncing.
4. **Worker Earnings & Payout Ledger (Admin Operations)**:
   - Real-time KPI summary cards (Gross Service Volume, Customer Tips, Platform Margin, Settled, Pending).
   - Dynamic Commission Tuner: 0% (Promotional), 5% (Standard), 8%, and 10%.
   - 100% of customer tips passed through to workers.
   - 1-Click instant UPI and batch settlement with generated transaction references.
   - Itemized Statement modal and CSV spreadsheet export.
5. **Dynamic UPI QR Code & Printable Digital Tax Invoice**:
   - Dynamic UPI payment QR code for PhonePe, Google Pay, Paytm, and BHIM (`upi://pay?pa=...`).
   - Clean `@media print` layout for 1-click printing or PDF receipt generation.
6. **1-Click WhatsApp Direct Work Order Routing**:
   - Auto-generated bilingual dispatch slips with booking ID, customer details, and task notes.
7. **Worker Duty Switch (Partner Availability)**:
   - Live availability switcher: 🟢 **Online (Available Now)**, 🟡 **Busy (On Job)**, 🔴 **Offline (Shift Off)**.
8. **Live GPS Route Simulation**:
   - Simulated driver location tracking modal with ETA counter, route waypoints, and arrival confirmation.
9. **Progressive Web App (PWA)**:
   - Web App Manifest (`manifest.json`) with theme color `#ffc21a`.
   - Service worker caching (`service-worker.js`) for offline capabilities.

---

## 🌐 Cloud Deployment Setup

| Setting | Render Backend | Vercel Frontend |
|---|---|---|
| **Root Directory** | `marketplace/backend` | `marketplace/frontend` |
| **Framework** | Next.js / Node.js | Next.js |
| **Build Command** | `npm ci && npm run build` | `npm run build` |
| **Start Command** | `npm start` (`next start --hostname 0.0.0.0`) | Managed by Vercel |
| **Health Check** | `/api/health` | `/api/health` (rewritten) |

### Environment Variables:

#### On Render (`marketplace/backend`):
- `DATABASE_URL`: Your Neon PostgreSQL connection string:
  `postgresql://neondb_owner:npg_y4e6WcLGsDiA@ep-round-sunset-beu3754t-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
- `APP_ORIGIN`: Your production Vercel frontend URL (e.g. `https://kaamsetu-dun.vercel.app`)
- `DEMO_MODE`: `false`

#### On Vercel (`marketplace/frontend`):
- `SWABHIMAN_API_ORIGIN`: Your Render backend HTTPS URL (e.g. `https://kaamsetu.onrender.com` or your Render service name)
