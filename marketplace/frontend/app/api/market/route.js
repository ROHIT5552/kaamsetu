import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const fallbackPeople = [
  {
    id: "w1",
    name: "Santosh Shinde",
    category: "plumbing",
    area: "Garkheda",
    rate: 45000, // 450 in paise
    bio: "Certified master plumber with 8+ years experience in CPVC pipelines, leak detection, water tank fittings & sanitary ware.",
    lat: 19.8631,
    lng: 75.3524,
    demo: true,
    score: 4.9,
    rating_count: 38,
    reviews: [
      { score: 5, note: "Prompt arrival and fixed the kitchen faucet leak within 30 mins. Very polite.", category: "plumbing", created_at: new Date().toISOString() }
    ]
  },
  {
    id: "w2",
    name: "Ganesh Kulkarni",
    category: "electrical",
    area: "Osmanpura",
    rate: 40000,
    bio: "Licensed wireman specializing in short circuit troubleshooting, MCB replacement, inverter setups & 3-phase wiring.",
    lat: 19.8712,
    lng: 75.3218,
    demo: true,
    score: 4.8,
    rating_count: 52,
    reviews: [
      { score: 5, note: "Clean work on our inverter rewiring. Verified all earthing points.", category: "electrical", created_at: new Date().toISOString() }
    ]
  },
  {
    id: "w3",
    name: "Rafiq Tamboli",
    category: "carpentry",
    area: "Jalna Road",
    rate: 55000,
    bio: "Artisan carpenter for modular kitchen adjustments, hydraulic hinge repairs, wardrobe lock fitting & plywood restoration.",
    lat: 19.8765,
    lng: 75.3612,
    demo: true,
    score: 4.9,
    rating_count: 44,
    reviews: [
      { score: 5, note: "Master carpenter! Fixed our sliding wardrobe door smoothly.", category: "carpentry", created_at: new Date().toISOString() }
    ]
  },
  {
    id: "w4",
    name: "Vikram Jadhav",
    category: "painting",
    area: "CIDCO N-3",
    rate: 35000,
    bio: "Interior & exterior emulsion painting specialist with waterproof putty application and texture wall finishing.",
    lat: 19.8890,
    lng: 75.3789,
    demo: true,
    score: 4.7,
    rating_count: 29,
    reviews: [
      { score: 5, note: "Punctual, covered all furniture before starting paint. Excellent finish.", category: "painting", created_at: new Date().toISOString() }
    ]
  },
  {
    id: "w5",
    name: "Babanrao More",
    category: "masonry",
    area: "Beed Bypass",
    rate: 60000,
    bio: "Experienced civil mason for tile grouting, wall crack plastering, bathroom waterproofing & brickwork renovations.",
    lat: 19.8456,
    lng: 75.3345,
    demo: true,
    score: 4.8,
    rating_count: 31,
    reviews: [
      { score: 5, note: "Repaired the wall dampness and replaced broken tiles neatly.", category: "masonry", created_at: new Date().toISOString() }
    ]
  },
  {
    id: "w6",
    name: "Arjun Rathod",
    category: "general",
    area: "Samarth Nagar",
    rate: 30000,
    bio: "Reliable helper for home shifting, furniture loading, garden cleaning, and renovation debris handling.",
    lat: 19.8812,
    lng: 75.3289,
    demo: true,
    score: 4.6,
    rating_count: 19,
    reviews: [
      { score: 4.5, note: "Very energetic and helped load our shifting boxes with utmost care.", category: "general", created_at: new Date().toISOString() }
    ]
  }
];

const fallbackJobs = [
  {
    id: "j1",
    title: "Overhead Water Tank Float Valve Replacement",
    category: "plumbing",
    area: "Garkheda",
    description: "500L Sintex water tank overflow valve stuck in open position, water spilling on terrace. Need quick valve swap.",
    amount: 35000,
    starts: new Date(Date.now() + 3600000).toISOString(),
    hours: 1,
    lat: 19.8631,
    lng: 75.3524,
    name: "Nilesh Patwardhan"
  },
  {
    id: "j2",
    title: "Main MCB Trip & Kitchen Switchboard Rewiring",
    category: "electrical",
    area: "Osmanpura",
    description: "Kitchen refrigerator socket sparks causing 32A MCB to trip repeatedly. Need circuit diagnosis.",
    amount: 50000,
    starts: new Date(Date.now() + 7200000).toISOString(),
    hours: 2,
    lat: 19.8712,
    lng: 75.3218,
    name: "Pooja Deshmukh"
  },
  {
    id: "j3",
    title: "Store Room Clearance & Shifting 15 Heavy Boxes",
    category: "general",
    area: "Beed Bypass",
    description: "Need strong helper to move 15 packaged cardboard cartons from ground floor to 1st floor storeroom.",
    amount: 45000,
    starts: new Date(Date.now() + 10800000).toISOString(),
    hours: 2,
    lat: 19.8456,
    lng: 75.3345,
    name: "Sachin Khedkar"
  }
];

export async function GET() {
  return NextResponse.json({
    ok: true,
    user: null,
    people: fallbackPeople,
    jobs: fallbackJobs,
    threads: [],
    messages: [],
    offers: [],
    checks: [],
    saved: []
  }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    return NextResponse.json({
      ok: true,
      message: "Action recorded successfully",
      action: body?.action || 'unknown'
    }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
}
