import { pool } from '../../../lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };

export async function GET() {
  try {
    await pool().query('SELECT 1');
    return Response.json(
      { ok: true, status: 'healthy', db: 'connected', service: 'swabhiman-backend' },
      { headers }
    );
  } catch (err) {
    // If DB is waking up from serverless sleep, return reconnecting status without 503 crash
    return Response.json(
      { ok: true, status: 'degraded', db: 'reconnecting', notice: err.message },
      { headers }
    );
  }
}
