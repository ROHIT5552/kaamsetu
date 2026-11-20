export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };

export async function GET() {
  return Response.json({
    ok: true,
    stats: {
      totalWorkers: 26,
      verifiedWorkers: 24,
      pendingKYC: 2,
      activeLocalities: 6,
      totalBookings: 142,
      completedJobs: 138,
      grossServiceVolumeINR: 78500,
      totalDisbursedINR: 74200,
      pendingDisbursalsINR: 4300,
      customerSatisfaction: 4.88,
      city: "Chhatrapati Sambhajinagar"
    }
  }, { headers });
}
