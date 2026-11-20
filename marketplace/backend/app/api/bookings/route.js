export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };

const IN_MEMORY_BOOKINGS = [
  {
    id: 1730001,
    workerId: 101,
    workerName: "Santosh Shinde",
    workerSkill: "plumber",
    workerArea: "CIDCO",
    workerPhone: "9822011223",
    customerName: "Vikram Deshmukh",
    customerPhone: "9422114455",
    customerAddress: "Flat 402, Sai Shraddha Apts, N-2 CIDCO",
    date: "Today",
    slot: "11:00 AM - 12:00 PM",
    jobNote: "Concealed pipe dripping inside master bedroom wall",
    status: "confirmed",
    estimatedAmt: 500,
    createdAt: "29/10/2026"
  },
  {
    id: 1730002,
    workerId: 201,
    workerName: "Ganesh Kulkarni",
    workerSkill: "electrician",
    workerArea: "Osmanpura",
    workerPhone: "9422077889",
    customerName: "Pooja Patil",
    customerPhone: "9823556677",
    customerAddress: "Plot 18, Opp. Kranti Chowk Police Stn, Osmanpura",
    date: "Tomorrow",
    slot: "02:00 PM - 04:00 PM",
    jobNote: "Main MCB tripping whenever water heater switches ON",
    status: "paid",
    estimatedAmt: 600,
    paidAt: "10:45 AM",
    reviewed: true,
    userRating: 5,
    createdAt: "28/10/2026"
  }
];

export async function GET() {
  return Response.json(
    { ok: true, count: IN_MEMORY_BOOKINGS.length, bookings: IN_MEMORY_BOOKINGS },
    { headers }
  );
}

export async function POST(request) {
  try {
    const b = await request.json();
    const newBooking = {
      id: Date.now(),
      workerId: b.workerId || 101,
      workerName: b.workerName || "Assigned Technician",
      workerSkill: b.workerSkill || "plumber",
      workerArea: b.workerArea || "CIDCO",
      workerPhone: b.workerPhone || "9822000000",
      customerName: b.customerName || "Customer",
      customerPhone: b.customerPhone || "9800000000",
      customerAddress: b.customerAddress || "Chhatrapati Sambhajinagar",
      date: b.date || "Today",
      slot: b.slot || "Immediate Dispatch",
      jobNote: b.jobNote || "Standard repair service",
      status: "confirmed",
      estimatedAmt: Number(b.estimatedAmt) || 550,
      createdAt: new Date().toLocaleDateString()
    };

    IN_MEMORY_BOOKINGS.unshift(newBooking);

    return Response.json(
      { ok: true, booking: newBooking, message: "Booking confirmed successfully" },
      { status: 201, headers }
    );
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 400, headers });
  }
}

export async function PATCH(request) {
  try {
    const { id, status, paidAt, reviewed, userRating } = await request.json();
    const booking = IN_MEMORY_BOOKINGS.find(b => b.id === Number(id));
    if (!booking) {
      return Response.json({ ok: false, error: "Booking not found" }, { status: 404, headers });
    }

    if (status) booking.status = status;
    if (paidAt) booking.paidAt = paidAt;
    if (reviewed !== undefined) booking.reviewed = reviewed;
    if (userRating) booking.userRating = userRating;

    return Response.json({ ok: true, booking }, { headers });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 400, headers });
  }
}
