import { createHmac,timingSafeEqual } from 'node:crypto';
import { transaction } from '../../../../lib/db';
import { audit,providerKey,providerPayload,providerStart,readSmallBody } from '../../../../lib/verification';

export const runtime='nodejs';
function reply(status) {
  return Response.json({ok:status===200},{status,headers:{'Cache-Control':'no-store'}});
}
export async function POST(request) {
  const key=providerKey();
  if (!key || process.env.DEMO_MODE==='true') return reply(404);
  const time=request.headers.get('x-ks-timestamp')||'';
  const signature=request.headers.get('x-ks-signature')||'';
  if (!/^\d{10}$/.test(time) || Math.abs(Date.now()/1000-Number(time))>300 ||
      !/^[a-f0-9]{64}$/i.test(signature)) return reply(401);
  if (request.headers.get('content-type')?.split(';')[0].trim()!=='application/json') return reply(415);
  try {
    const body=await readSmallBody(request,4096);
    const expected=createHmac('sha256',key).update(time+'.').update(body).digest();
    if (!timingSafeEqual(expected,Buffer.from(signature,'hex'))) return reply(401);
    const parsed=providerPayload.safeParse(JSON.parse(body.toString('utf8')));
    if (!parsed.success) return reply(400);
    const {caseId,evidenceRef,method,result,validUntil}=parsed.data;
    if (!providerStart(method,caseId)) return reply(409);
    if (validUntil && !Number.isFinite(Date.parse(validUntil))) return reply(400);
    const status=await transaction(async db=>{
      const {rows:[item]}=await db.query(`SELECT c.* FROM verification_cases c
        JOIN accounts a ON a.id=c.account WHERE c.id=$1 AND NOT a.demo FOR UPDATE OF c`,[caseId]);
      if (!item || item.method!==method) return 404;
      if (item.status==='withdrawn') return 410;
      if (item.status!=='submitted') {
        const expires=item.valid_until?.toISOString()??null;
        return item.evidence_ref===evidenceRef && item.provider_result===result &&
          expires===(validUntil?new Date(validUntil).toISOString():null) ? 200 : 409;
      }
      if (result==='passed' && ((method==='trade'&&!validUntil) || (validUntil&&Date.parse(validUntil)<=Date.now()))) return 400;
      await db.query(`UPDATE verification_cases SET status='ready',provider_result=$2,evidence_ref=$3,
        valid_until=$4,updated_at=now() WHERE id=$1`,[caseId,result,evidenceRef,validUntil]);
      await audit(db,caseId,null,result==='passed'?'provider_passed':'provider_failed');
      return 200;
    });
    return reply(status);
  } catch(error) {
    if (error instanceof SyntaxError) return reply(400);
    if (error.code==='23505') return reply(409);
    if (error.status===413) return reply(413);
    console.error('Verification callback failed',error.code||error.name);
    return reply(503);
  }
}