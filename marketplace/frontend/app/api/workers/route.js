import { INITIAL_WORKERS } from '../../../lib/swabhiman-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };

export async function GET(request) {
  const url = new URL(request.url);
  const skill = url.searchParams.get('skill');
  const area = url.searchParams.get('area');
  const sort = url.searchParams.get('sort') || 'rating';
  const q = url.searchParams.get('q');

  let list = [...INITIAL_WORKERS];
  if (skill && skill !== 'all') list = list.filter(w => w.skill === skill);
  if (area && area !== 'all') list = list.filter(w => w.area.toLowerCase() === area.toLowerCase());
  if (q) {
    const term = q.toLowerCase();
    list = list.filter(w => w.name.toLowerCase().includes(term) || (w.bio || '').toLowerCase().includes(term));
  }

  if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
  else if (sort === 'priceLow') list.sort((a, b) => a.rate - b.rate);
  else if (sort === 'jobs') list.sort((a, b) => b.jobs - a.jobs);

  return Response.json({ ok: true, count: list.length, workers: list }, { headers });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const newWorker = {
      id: Date.now(),
      name: body.name || 'New Worker',
      skill: body.skill || 'helper',
      area: body.area || 'CIDCO',
      rate: Number(body.rate) || 300,
      visit: Number(body.visit) || 150,
      phone: body.phone || '9822000000',
      rating: 5.0,
      jobs: 0,
      avail: 'now',
      verified: false,
      status: 'pending'
    };
    return Response.json({ ok: true, worker: newWorker }, { status: 201, headers });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 400, headers });
  }
}
