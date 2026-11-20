# SWABHIMAN (KaamSetu)

SWABHIMAN is a local trades marketplace for Chhatrapati Sambhajinagar. Employers publish scoped work, and workers list their services and rates. Both sides can negotiate a total price, exchange messages and follow the booking through arrival and completion. The interface supports English, Marathi and Hindi. User-entered descriptions and messages appear in their original language.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v22.x or later
- **Database**: PostgreSQL 16+ or [Neon DB](https://neon.tech) (Serverless Postgres)

### 2. Environment Setup
Copy `.env.example` to `.env.local` and configure your database connection string:

```bash
# Copy example environment file
cp .env.example .env.local
```

Inside `.env.local`:
```env
# Database connection string (local Postgres or Neon DB with ?sslmode=require)
DATABASE_URL=postgresql://<user>:<password>@<host>/<dbname>?sslmode=require

# Application URL
APP_ORIGIN=http://localhost:3000

# Enable demo fixture logins & seed data (true / false)
DEMO_MODE=true
```

---

## 💻 Project Start & Management Commands

### Install Dependencies
```bash
# Standard install
npm install

# Or clean install (recommended for CI / fresh clones)
npm ci
```
*(On Windows PowerShell, if script execution policy restrictions apply, use `npm.cmd install`)*

---

### Database Commands

| Command | Description |
| :--- | :--- |
| `npm run db:migrate` | Runs database migrations from `.env.local` |
| `npm run db:migrate:hosted` | Runs database migrations using host environment variables (Render / CI) |
| `npm run db:seed` | Seeds 20 workers, 10 jobs, 6 completed reviews and 3 demo logins |

```powershell
# Run database schema migrations
npm run db:migrate

# Seed demo fixtures (workers, jobs, accounts)
npm run db:seed
```

---

### Development Server

```bash
# Start Next.js development server on port 3000
npm run dev

# If port 3000 is occupied, run on another port (e.g. 3001)
npm run dev -- -p 3001
```
Open **`http://localhost:3000`** in your browser.

---

### Production Build & Run (Local)

```bash
# 1. Build optimized production bundle
npm run build

# 2. Start production server (listens on 0.0.0.0:$PORT)
npm start
```

---

### Testing & Verification

| Command | Description |
| :--- | :--- |
| `npm run test:smoke` | Runs automated smoke tests against local demo |
| `npm run test:verification` | Runs worker identity & trade verification test suite |
| `npm run verification:reviewer -- grant <UUID>` | Grants staff verification reviewer permissions |
| `npm run verification:reviewer -- revoke <UUID>` | Revokes staff verification reviewer permissions |
| `npm run verification:fixture -- <UUID> alternative passed` | Simulates a passed verification callback |

---

## 👥 Seeded Demo Accounts

When `DEMO_MODE=true`, you can sign in instantly using any of these test accounts:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Employer** | `sample-employer@demo.invalid` | `HireDemo!2026` |
| **Plumber** | `sample0@demo.invalid` | `TradeDemo!2026` |
| **Electrician** | `sample1@demo.invalid` | `ElectricDemo!2026` |

---

## ☁️ Deployment Guide

### Option 1: Vercel (Recommended)
- **Framework Preset**: `Next.js`
- **Root Directory**: `./` (Root)
- **Build Command**: `npm run build`
- **Environment Variables**:
  - `DATABASE_URL`: Your pooled Neon DB URL (`postgresql://...-pooler....neon.tech/neondb?sslmode=require&channel_binding=require`)
  - `APP_ORIGIN`: `https://your-app.vercel.app`
  - `DEMO_MODE`: `true` (for demo fixtures) or `false` (for production)

### Option 2: Render Web Service
- **Runtime**: `Node`
- **Root Directory**: `./` (Leave blank)
- **Build Command**: `npm ci && npm run build`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `DATABASE_URL`: Your Neon DB connection string
  - `APP_ORIGIN`: `https://your-service.onrender.com`
  - `DEMO_MODE`: `true` or `false`

---

## 🏛️ Architecture & Highlights

- **Next.js App Router**: High-performance responsive React frontend with SSR and API route handlers (`/api/market`, `/api/health`, `/api/verification/provider`).
- **PostgreSQL / Neon DB**: Robust ACID storage backing profiles, listings, chat messages, offers, bookings, ratings, and tamper-resistant audit logs.
- **Photo Uploads**: Client-side canvas compression (`webp`/`jpeg` with binary magic byte validation) under 350KB.
- **Security & Privacy**: Scrypt-hashed passwords, random session tokens in HttpOnly SameSite cookies, database-backed rate limiting, and parameter-safe queries.
