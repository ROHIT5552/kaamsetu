import { createHmac,randomUUID } from 'node:crypto';
import { z } from 'zod';

const origin=process.env.APP_ORIGIN;
const secret=process.env.VERIFICATION_WEBHOOK_SECRET;
const [caseId,method,result='passed']=process.argv.slice(2);
if (process.env.KS_VERIFICATION_TEST!=='true' || !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin||'') ||
    process.env.DEMO_MODE==='true' || !/^[a-f0-9]{64}$/i.test(secret||'')) {
  throw new Error('Use a dedicated local verification test environment.');
}
if (!z.uuid().safeParse(caseId).success || !['alternative','aadhaar','trade'].includes(method) ||
    !['passed','failed'].includes(result)) {
  throw new Error('Usage: npm run verification:fixture -- CASE_UUID alternative|aadhaar|trade [passed|failed]');
}
const timestamp=String(Math.floor(Date.now()/1000));
const body=JSON.stringify({caseId,evidenceRef:randomUUID(),method,result,
  validUntil:method==='trade'&&result==='passed'?new Date(Date.now()+86400000).toISOString():null});
const signature=createHmac('sha256',Buffer.from(secret,'hex')).update(timestamp+'.'+body).digest('hex');
const response=await fetch(origin+'/api/verification/provider',{method:'POST',body,headers:{
  'Content-Type':'application/json','x-ks-timestamp':timestamp,'x-ks-signature':signature
}});
if (!response.ok) throw new Error('Test callback returned HTTP '+response.status);
console.log('Test callback accepted. Refresh the review queue.');