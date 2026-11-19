import { activeCheck,audit,consentVersion,providerStart } from './verification';

function assert(value,code,status=409) {
  if (!value) throw Object.assign(new Error(code),{status});
}
export function enabled(method) {
  return Boolean(providerStart(method,'preview') &&
    (method!=='aadhaar' || providerStart('alternative','preview')));
}

export async function workerChecks(db,user) {
  if (!user || user.role!=='worker') return [];
  if (user.demo) {
    return (await db.query('SELECT kind,method,verified_at FROM credentials WHERE account=$1',[user.id])).rows;
  }
  const {rows}=await db.query(`SELECT DISTINCT ON(kind) id,kind,method,reason,
    CASE WHEN status='approved' AND valid_until<=now() THEN 'expired' ELSE status END AS status,valid_until
    FROM verification_cases WHERE account=$1 ORDER BY kind,created_at DESC,id DESC`,[user.id]);
  return rows.map(item=>({...item,link:item.status==='submitted'&&enabled(item.method)?providerStart(item.method,item.id):null}));
}

export async function submitCheck(db,user,input) {
  assert((input.kind==='identity')===(input.method!=='trade'),'invalid',400);
  if (user.demo) {
    await db.query(`INSERT INTO credentials(account,kind,method,reference,verified_at)
      VALUES ($1,$2,$3,gen_random_uuid()::text,now()) ON CONFLICT(account,kind) DO NOTHING`,
    [user.id,input.kind,input.method]);
    return;
  }
  assert(input.consentVersion===consentVersion && enabled(input.method),'verificationSetup',503);
  await db.query('SELECT id FROM accounts WHERE id=$1 FOR UPDATE',[user.id]);
  const {rows:[active]}=await db.query(`SELECT id,method,status,valid_until FROM verification_cases
    WHERE account=$1 AND kind=$2 AND status IN ('submitted','ready','approved') FOR UPDATE`,[user.id,input.kind]);
  if (active?.status==='approved' && active.valid_until && active.valid_until<=new Date()) {
    await db.query("UPDATE verification_cases SET status='rejected',reason='expired',updated_at=now() WHERE id=$1",[active.id]);
    await audit(db,active.id,null,'expired','expired');
  } else if (active) {
    assert(active.status==='submitted' && active.method===input.method,'verificationActive');
    return;
  }
  const {rows:[item]}=await db.query(`INSERT INTO verification_cases(account,kind,method,consent_version)
    VALUES ($1,$2,$3,$4) RETURNING id`,[user.id,input.kind,input.method,consentVersion]);
  await audit(db,item.id,user.id,'consent_recorded');
}

export async function withdrawCheck(db,user,id) {
  const result=await db.query(`UPDATE verification_cases SET status='withdrawn',provider_result=NULL,
    evidence_ref=NULL,valid_until=NULL,reason=NULL,updated_at=now()
    WHERE id=$1 AND account=$2 AND status<>'withdrawn'`,[id,user.id]);
  assert(result.rowCount,'missing',404);
  await audit(db,id,user.id,'consent_withdrawn');
}

export async function reviewQueue(db,status) {
  return (await db.query(`SELECT c.id,c.kind,c.method,c.status,c.provider_result,c.valid_until,c.reason,
    c.created_at,c.evidence_ref,a.name,p.category,
    (SELECT json_agg(events ORDER BY events.created_at DESC,events.id DESC) FROM
      (SELECT e.id,e.action,e.reason,e.created_at,r.name AS actor
       FROM verification_events e LEFT JOIN accounts r ON r.id=e.actor
       WHERE e.verification=c.id ORDER BY e.created_at DESC,e.id DESC LIMIT 12) events) AS history
    FROM verification_cases c JOIN accounts a ON a.id=c.account LEFT JOIN profiles p ON p.account=a.id
    WHERE c.status=$1 AND NOT a.demo ORDER BY c.created_at,c.id LIMIT 100`,[status])).rows;
}

export async function decideCheck(db,user,input) {
  const access=await db.query('SELECT account FROM verification_reviewers WHERE account=$1 FOR SHARE',[user.id]);
  assert(user.reviewer && access.rowCount,'forbidden',403);
  const {rows:[item]}=await db.query(`SELECT c.* FROM verification_cases c
    JOIN accounts a ON a.id=c.account WHERE c.id=$1 AND NOT a.demo FOR UPDATE OF c`,[input.id]);
  assert(item && item.account!==user.id,'missing',404);
  const revoke=input.decision==='revoke';
  assert(item.status===(revoke?'approved':'ready'),'verificationActive');
  const approve=input.decision==='approve';
  if (approve) {
    const {rows:[eligible]}=await db.query(`SELECT provider_result='passed' AND evidence_ref IS NOT NULL
      AND (valid_until IS NULL OR valid_until>now()) AS ok FROM verification_cases WHERE id=$1`,[item.id]);
    assert(eligible.ok,'verification');
  }
  assert(approve ? !input.reason : Boolean(input.reason),'invalid',400);
  await db.query('UPDATE verification_cases SET status=$2,reason=$3,updated_at=now() WHERE id=$1',
    [input.id,approve?'approved':'rejected',input.reason??null]);
  await audit(db,input.id,user.id,revoke?'revoked':approve?'approved':'rejected',input.reason);
}

export async function verifiedKinds(db,account,demo) {
  const query=demo?'SELECT kind FROM credentials WHERE account=$1 AND verified_at IS NOT NULL':
    `SELECT kind FROM verification_cases c WHERE c.account=$1 AND ${activeCheck} FOR SHARE`;
  return new Set((await db.query(query,[account])).rows.map(row=>row.kind));
}