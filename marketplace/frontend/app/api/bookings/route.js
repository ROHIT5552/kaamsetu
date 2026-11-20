import { INITIAL_BOOKINGS } from '../../../lib/kaamsetu-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };

const liveBookings = [...INITIAL_BOOKINGS];

export async function GET() {
  return Response.json({ ok: true, count: liveBookings.length, bookings: liveBookings }, { headers });
}

export async function POST(request) {
  try {
    const data = await request.json();
    const newBooking = {
      id: Date.now(),
      workerId: data.workerId || 101,
      workerName: data.workerName || 'Worker',
      workerSkill: data.workerSkill || 'plumber',
      workerArea: data.workerArea || 'CIDCO',
      workerPhone: data.workerPhone || '9822000000',
      customerName: data.customerName || 'Customer',
      customerPhone: data.customerPhone || '9800000000',
      customerAddress: data.customerAddress || 'Chhatrapati Sambhajinagar',
      date: data.date || 'Today',
      slot: data.slot || 'Morning',
      jobNote: data.jobNote || 'Repair service',
      status: 'confirmed',
      estimatedAmt: Number(data.estimatedAmt) || 550,
      createdAt: new Date().toLocaleDateString()
    };
    liveBookings.unshift(newBooking);
    return Response.json({ ok: true, booking: newBooking }, { status: 201, headers });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 400, headers });
  }
}
