import { createHmac } from 'node:crypto';
import { z } from 'zod';

export const consentVersion='2026-11-v1';
export const rejectionReasons=['provider_failed','details_mismatch','expired','out_of_scope'];
export const providerPayload=z.strictObject({
  caseId:z.uuid(), evidenceRef:z.uuid(),
  method:z.enum(['aadhaar','alternative','trade']),
  result:z.enum(['passed','failed']),
  validUntil:z.iso.datetime().nullable()
});
export const activeCheck=`c.status='approved' AND (c.valid_until IS NULL OR c.valid_until>now())`;

export function providerKey() {
  const key=process.env.VERIFICATION_WEBHOOK_SECRET;
  return /^[a-f0-9]{64}$/i.test(key||'') ? Buffer.from(key,'hex') : null;
}
export function providerStart(method,caseId) {
  const key=providerKey();
  if (!key) return null;
  const endpoint={aadhaar:process.env.VERIFICATION_AADHAAR_URL,
    alternative:process.env.VERIFICATION_ALTERNATIVE_URL,trade:process.env.VERIFICATION_TRADE_URL}[method];
  if (!endpoint) return null;
  try {
    const url=new URL(endpoint);
    if (url.protocol!=='https:' || url.username || url.password || url.hash) return null;
    url.searchParams.set('case',caseId);
    url.searchParams.set('method',method);
    const expires=String(Math.floor(Date.now()/1000)+600);
    const token=createHmac('sha256',key).update(['launch',caseId,method,expires].join('.')).digest('hex');
    url.searchParams.set('expires',expires);
    url.searchParams.set('token',token);
    return url.toString();
  } catch { return null; }
}
export async function audit(db,id,actor,action,reason=null) {
  await db.query('INSERT INTO verification_events(verification,actor,action,reason) VALUES ($1,$2,$3,$4)',[id,actor,action,reason]);
}
export async function readSmallBody(request,max=8192) {
  const reader=request.body?.getReader();
  if (!reader) throw new SyntaxError('Missing body');
  const chunks=[];
  let bytes=0;
  try {
    for (;;) {
      const {done,value}=await reader.read();
      if (done) break;
      bytes+=value.byteLength;
      if (bytes>max) throw Object.assign(new Error('invalid'),{status:413});
      chunks.push(value);
    }
  } finally {await reader.cancel();}
  return Buffer.concat(chunks);
}