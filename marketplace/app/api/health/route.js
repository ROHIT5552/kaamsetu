import { pool } from '../../../lib/db';

export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};

export async function GET() {
  try {
    await pool().query('SELECT 1');
    return Response.json({ok:true},{headers});
  } catch {
    return Response.json({ok:false},{status:503,headers});
  }
}