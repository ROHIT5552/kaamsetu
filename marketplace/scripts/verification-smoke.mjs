import assert from 'node:assert/strict';
import { createHmac,randomUUID } from 'node:crypto';
import { openDatabase } from '../lib/connection.mjs';

const origin=process.env.APP_ORIGIN;
const key=process.env.VERIFICATION_WEBHOOK_SECRET;
if (process.env.KS_VERIFICATION_TEST!=='true' || !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin||'') ||
    process.env.DEMO_MODE==='true' || !key) throw Error('Use a dedicated local verification test environment.');
const db=openDatabase();
const suffix=randomUUID();
let worker='',employer='';
function sign(value) {return createHmac('sha256',Buffer.from(key,'hex')).update(value).digest('hex');}
async function json(path,options,status) {
  const response=await fetch(origin+path,options);
  const data=await response.json();
  assert.equal(response.status,status,path+': '+JSON.stringify(data));
  return {data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
function market(path,cookie,status=200) {
  return json('/api/market'+path,{headers:{cookie}},status).then(response=>response.data);
}
function action(cookie,action,input,status=200) {
  return json('/api/market',{method:'POST',headers:{origin,cookie,'Content-Type':'application/json'},
    body:JSON.stringify({action,input})},status);
}
function notify(payload,status=200,{timestamp=Math.floor(Date.now()/1000),valid=true}={}) {
  const body=JSON.stringify(payload);
  return json('/api/verification/provider',{method:'POST',body,headers:{
    'Content-Type':'application/json','x-ks-timestamp':String(timestamp),
    'x-ks-signature':valid?sign(timestamp+'.'+body):'0'.repeat(64)}},status);
}
try {
  worker=(await action('','signup',{email:'worker-'+suffix+'@example.invalid',name:'Verification smoke worker',role:'worker',password:randomUUID()})).cookie;
  employer=(await action('','signup',{email:'reviewer-'+suffix+'@example.invalid',name:'Verification smoke reviewer',role:'employer',password:randomUUID()})).cookie;
  await market('?review=ready',employer,403);
  const w=await market('',worker), e=await market('',employer);
  await db.query('INSERT INTO verification_reviewers(account) VALUES ($1)',[e.user.id]);
  await action(worker,'profile',{category:'electrical',area:'CIDCO',rate:45000,bio:'Electrical work',available:true});
  await action(worker,'verify',{kind:'identity',method:'alternative',consent:true},503);
  await action(worker,'verify',{kind:'identity',method:'alternative',consent:true,consentVersion:w.verification.consentVersion});
  const [identity]=(await market('',worker)).checks;
  const url=new URL(identity.link), token=url.searchParams.get('token');
  assert.equal(token,sign('launch.'+identity.id+'.alternative.'+url.searchParams.get('expires')));
  const payload={caseId:identity.id,evidenceRef:randomUUID(),method:'alternative',result:'passed',validUntil:null};
  await action(employer,'reviewCheck',{id:identity.id,decision:'approve'},409);
  await notify(payload,401,{valid:false});
  await notify(payload,401,{timestamp:Math.floor(Date.now()/1000)-301});
  await notify({...payload,method:'trade'},404);
  await notify(payload);
  await notify(payload);
  await notify({...payload,evidenceRef:randomUUID()},409);
  await action(worker,'reviewCheck',{id:identity.id,decision:'approve'},403);
  assert.equal((await market('?review=ready',employer)).queue[0].id,identity.id);
  await action(employer,'reviewCheck',{id:identity.id,decision:'approve'});
  assert.ok(!(await market('',employer)).people.some(p=>p.id===w.user.id));
  await action(worker,'verify',{kind:'electrical-license',method:'trade',consent:true,consentVersion:w.verification.consentVersion});
  const trade=(await market('',worker)).checks.find(item=>item.method==='trade');
  const license={...payload,caseId:trade.id,evidenceRef:randomUUID(),method:'trade'};
  await notify(license,400);
  await notify({...license,validUntil:new Date(Date.now()+86400000).toISOString()});
  await action(employer,'reviewCheck',{id:trade.id,decision:'approve'});
  assert.ok((await market('',employer)).people.some(p=>p.id===w.user.id));
  await action(employer,'withdrawCheck',{id:identity.id},403);
  await action(worker,'withdrawCheck',{id:identity.id});
  await notify(payload,410);
  assert.ok(!(await market('',employer)).people.some(p=>p.id===w.user.id));
  const withdrawn=(await market('?review=withdrawn',employer)).queue.find(item=>item.id===identity.id);
  assert.equal(withdrawn.evidence_ref,null);
  assert.equal(withdrawn.history[0].action,'consent_withdrawn');
  await db.query("UPDATE sessions SET expires=now()+interval '6 days' WHERE account=$1",[e.user.id]);
  await market('?review=ready',employer,403);
  console.log('Verification lifecycle, signed callback, reviewer access, electrical expiry requirement and withdrawal passed.');
} finally {await db.end();}