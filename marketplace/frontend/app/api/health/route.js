export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };

export async function GET() {
  return Response.json({
    ok: true,
    status: 'healthy',
    edge: true,
    platform: 'swabhiman-frontend',
    timestamp: new Date().toISOString()
  }, { headers });
}
