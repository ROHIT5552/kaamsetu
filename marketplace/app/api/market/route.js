import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { pool, transaction } from '../../../lib/db';
import { activeCheck,consentVersion,rejectionReasons } from '../../../lib/verification';
import { enabled,workerChecks,submitCheck,withdrawCheck,reviewQueue,decideCheck,verifiedKinds } from '../../../lib/review';
import { categories, areas, requiredCredential, transitions, distance } from '../../../lib/domain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const hash = value => createHash('sha256').update(value).digest('hex');
const demo = () => process.env.DEMO_MODE==='true' && /^http:\/\/localhost:\d+$/.test(process.env.APP_ORIGIN||'');
const reply = (data,status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const one = async (db,sql,params=[]) => (await db.query(sql,params)).rows[0];
const rows = async (db,sql,params=[]) => (await db.query(sql,params)).rows;
function requireThat(value, code='forbidden', status=403) {
  if (!value) throw Object.assign(new Error(code),{status});
}
const text = max => z.string().trim().min(1).max(max);
const id = z.uuid();
const category = z.enum(categories);
const area = z.enum(areas);
const money = z.number().int().min(5000).max(100000000);
const point = z.object({lat:z.number().min(-90).max(90),lng:z.number().min(-180).max(180)});
const email = z.email().max(254).transform(s=>s.toLowerCase());
const jobDetails=z.object({title:text(90),category,area,description:text(1400),amount:money,
  starts:z.iso.datetime(),hours:z.number().int().min(1).max(48),point:point.optional()});
const schemas = {
  signup:z.object({email,name:text(70),password:z.string().min(12).max(128),role:z.enum(['worker','employer'])}),
  login:z.object({email,password:z.string().min(1).max(128)}),
  demo:z.object({role:z.enum(['worker','employer']),room:z.string().regex(/^[a-zA-Z0-9-]{8,50}$/)}),
  logout:z.object({}),
  profile:z.object({category,area,rate:money,bio:text(400),available:z.boolean(),point:point.optional()}),
  verify:z.object({kind:z.enum(['identity','electrical-license']),method:z.enum(['aadhaar','alternative','trade']),consent:z.literal(true),consentVersion:z.string().max(25).optional()}),
  withdrawCheck:z.object({id}),
  reviewCheck:z.object({id,decision:z.enum(['approve','reject','revoke']),reason:z.enum(rejectionReasons).optional()}),
  job:jobDetails,
  editJob:jobDetails.extend({id}),
  closeJob:z.object({id}),
  rate:z.object({id,score:z.number().int().min(1).max(5),note:text(350).optional()}),
  saveListing:z.object({id,kind:z.enum(['job','worker']),saved:z.boolean()}),
  readThread:z.object({id,message:z.string().regex(/^[1-9][0-9]{0,18}$/)
    .refine(value=>BigInt(value)<=9223372036854775807n)}),
  apply:z.object({job:id,amount:money,note:text(500)}),
  invite:z.object({job:id,worker:id,amount:money,note:text(500)}),
  counter:z.object({id,amount:money,note:text(500),version:z.number().int().positive()}),
  decide:z.object({id,decision:z.enum(['accept','decline']),version:z.number().int().positive()}),
  message:z.object({id,body:text(1200)}),
  state:z.object({id,state:z.string().max(30)}),
  location:z.object({id,point:point.nullable()})
};
async function viewer(jar) {
  const token = jar.get('ks_session')?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return one(pool(), `SELECT a.id,a.name,a.role,a.demo,
    (NOT a.demo AND EXISTS (SELECT 1 FROM verification_reviewers r WHERE r.account=a.id)) AS reviewer_account,
    (NOT a.demo AND s.expires>now()+interval '6 days 23 hours 45 minutes'
      AND EXISTS (SELECT 1 FROM verification_reviewers r WHERE r.account=a.id)) AS reviewer
    FROM sessions s JOIN accounts a ON a.id=s.account
    WHERE s.token=$1 AND s.expires>now() AND a.demo=$2`,[hash(token),demo()]);
}
async function session(jar,account) {
  const old = jar.get('ks_session')?.value;
  if (old) await pool().query('DELETE FROM sessions WHERE token=$1',[hash(old)]);
  const token = randomBytes(32).toString('hex');
  await pool().query("INSERT INTO sessions VALUES ($1,$2,now()+interval '7 days')",[hash(token),account]);
  jar.set('ks_session',token,{httpOnly:true,sameSite:'lax',secure:process.env.APP_ORIGIN?.startsWith('https:'),path:'/',maxAge:604800});
}
function failure(error) {
  if (error.status) return reply({error:error.message},error.status);
  if (error instanceof z.ZodError || error instanceof SyntaxError) return reply({error:'invalid'},400);
  if (error.code === '23505') return reply({error:'duplicate'},409);
  console.error('Marketplace request failed',error.code || error.name);
  return reply({error:'unavailable'},503);
}
async function throttle(scope,max,seconds) {
  const bucket = Math.floor(Date.now()/(seconds*1000));
  const row = await one(pool(),`INSERT INTO limits VALUES ($1,$2,1)
    ON CONFLICT(scope,bucket) DO UPDATE SET hits=limits.hits+1 RETURNING hits`,[scope,bucket]);
  requireThat(row.hits<=max,'limited',429);
}

export async function GET(request) {
  try {
    const db=pool(), user=await viewer(await cookies());
    const coords=new URL(request.url).searchParams;
    if (coords.has('review')) {
      requireThat(user?.reviewer);
      const status=z.enum(['submitted','ready','approved','rejected','withdrawn']).parse(coords.get('review'));
      return reply({queue:await reviewQueue(db,status)});
    }
    const near=coords.has('lat') && coords.has('lng') ? point.safeParse({lat:Number(coords.get('lat')),lng:Number(coords.get('lng'))}) : null;
    const [jobs,people,profile,checks,threads,owned,saved]=await Promise.all([
      rows(db,`SELECT j.id,j.title,j.category,j.area,j.description,j.amount,j.starts,j.hours,j.lat,j.lng,a.name
        FROM jobs j JOIN accounts a ON a.id=j.employer WHERE a.demo=$1 AND j.starts>now() AND j.closed_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.job=j.id) ORDER BY j.created DESC LIMIT 100`,[demo()]),
      rows(db,`SELECT a.id,a.name,p.category,p.area,p.rate,p.bio,p.lat,p.lng,a.demo,
        ratings.score,ratings.count AS rating_count,recent.reviews
        FROM profiles p JOIN accounts a ON a.id=p.account
        LEFT JOIN LATERAL (SELECT round(avg(score),1) AS score,count(*)::int AS count
          FROM worker_ratings WHERE worker=a.id) ratings ON true
        LEFT JOIN LATERAL (SELECT json_agg(entry ORDER BY entry.created_at DESC) AS reviews FROM
          (SELECT r.score,r.note,r.created_at,j.category FROM worker_ratings r
            JOIN bookings b ON b.application=r.application JOIN jobs j ON j.id=b.job
            WHERE r.worker=a.id AND r.note IS NOT NULL ORDER BY r.created_at DESC,r.application DESC LIMIT 3) entry) recent ON true
        WHERE p.available AND a.demo=$1
        AND EXISTS (SELECT 1 FROM ${demo()?'credentials':'verification_cases'} c
          WHERE c.account=a.id AND c.kind='identity' AND ${demo()?'c.verified_at IS NOT NULL':activeCheck})
        AND (p.category<>'electrical' OR EXISTS (SELECT 1 FROM ${demo()?'credentials':'verification_cases'} c
          WHERE c.account=a.id AND c.kind='electrical-license' AND ${demo()?'c.verified_at IS NOT NULL':activeCheck})) ORDER BY a.name LIMIT 100`,[demo()]),
      user ? one(db,'SELECT category,area,rate,bio,available,lat,lng FROM profiles WHERE account=$1',[user.id]) : null,
      workerChecks(db,user),
      user ? rows(db,`SELECT x.id,x.worker,j.employer,x.author,x.amount,x.note,x.version,x.state,
        j.id AS job,j.title,j.starts,w.name AS worker_name,e.name AS employer_name,b.state AS booking,r.score AS rating,
        (SELECT count(*)::int FROM messages m WHERE m.application=x.id AND m.id>coalesce(cursor.seen_message,0) AND m.author<>$1) AS unread,
        CASE WHEN b.state='en_route' AND b.located_at>now()-interval '60 seconds' THEN b.lat END AS lat,
        CASE WHEN b.state='en_route' AND b.located_at>now()-interval '60 seconds' THEN b.lng END AS lng,
        CASE WHEN b.state='en_route' AND b.located_at>now()-interval '60 seconds' THEN b.located_at END AS located_at
        FROM applications x JOIN jobs j ON j.id=x.job JOIN accounts w ON w.id=x.worker
        JOIN accounts e ON e.id=j.employer LEFT JOIN bookings b ON b.application=x.id
        LEFT JOIN worker_ratings r ON r.application=x.id
        LEFT JOIN thread_reads cursor ON cursor.application=x.id AND cursor.account=$1
        WHERE x.worker=$1 OR j.employer=$1 ORDER BY j.created DESC LIMIT 100`,[user.id]) : [],
      user?.role==='employer' ? rows(db,`SELECT j.id,j.title,j.category,j.area,j.description,j.amount,j.starts,j.hours,
        CASE WHEN b.state IS NOT NULL THEN b.state WHEN j.closed_at IS NOT NULL THEN 'closed'
          WHEN j.starts<=now() THEN 'expired' ELSE 'open' END AS status,
        count(x.id)::int AS offer_count,count(x.id) FILTER (WHERE x.state='pending')::int AS pending_count,
        b.application AS thread
        FROM jobs j LEFT JOIN bookings b ON b.job=j.id LEFT JOIN applications x ON x.job=j.id
        WHERE j.employer=$1 GROUP BY j.id,b.state,b.application ORDER BY j.created DESC LIMIT 100`,[user.id]) : [],
      user ? rows(db,`SELECT item,'job' AS kind FROM saved_jobs WHERE account=$1
        UNION ALL SELECT item,'worker' AS kind FROM saved_workers WHERE account=$1`,[user.id]) : []
    ]);
    const thread=coords.get('thread');
    const selected=threads.find(t=>t.id===thread);
    const [messages,offers,events]=selected ? await Promise.all([
      rows(db,'SELECT * FROM (SELECT author,body,created,id FROM messages WHERE application=$1 ORDER BY id DESC LIMIT 100) m ORDER BY id',[thread]),
      rows(db,'SELECT version,author,amount,note,created FROM offer_history WHERE application=$1 ORDER BY version DESC LIMIT 30',[thread]),
      rows(db,'SELECT state,created FROM booking_events WHERE application=$1 ORDER BY id',[thread])
    ]) : [[],[],[]];
    const publicCards = list => list.map(({lat,lng,...item})=>({...item,
      km:near?.success && lat!=null && lng!=null ? Math.round(distance(near.data,{lat,lng})*10)/10 : null
    })).sort((a,b)=>(a.km??Infinity)-(b.km??Infinity));
    return reply({user,demo:demo(),verification:{consentVersion,methods:['alternative','aadhaar','trade'].filter(enabled)},jobs:publicCards(jobs),people:publicCards(people),profile,checks,threads,messages,offers,events,owned,saved,thread:selected?.id});
  } catch(error) { return failure(error); }
}

async function qualified(db,account,trade) {
  const kinds=await verifiedKinds(db,account,demo());
  return kinds.has('identity') && (!requiredCredential[trade] || kinds.has(requiredCredential[trade]));
}
export async function POST(request) {
  try {
    requireThat(process.env.APP_ORIGIN && request.headers.get('origin')===process.env.APP_ORIGIN,'origin');
    requireThat(request.headers.get('content-type')?.startsWith('application/json'),'invalid',415);
    const reader=request.body?.getReader();
    requireThat(reader,'invalid',400);
    let bytes=0, payload='';
    const decoder=new TextDecoder();
    try {
      for (;;) {
        const {done,value}=await reader.read();
        if (done) break;
        bytes+=value.byteLength;
        requireThat(bytes<=8192,'invalid',413);
        payload+=decoder.decode(value,{stream:true});
      }
    } finally { await reader.cancel(); }
    const raw=JSON.parse(payload+decoder.decode());
    const action=raw?.action;
    requireThat(typeof action==='string' && Object.hasOwn(schemas,action),'invalid',400);
    const input=schemas[action].strict().parse(raw.input);
    const jar=await cookies(), db=pool(), user=await viewer(jar);
    if (action==='signup' || action==='login' || action==='demo') {
      await throttle('auth:global',120,60);
      if (input.email) await throttle('auth:'+hash(input.email),8,300);
      if (action==='demo') {
        requireThat(demo() && new URL(process.env.APP_ORIGIN).hostname==='localhost');
        const account=await one(db,`INSERT INTO accounts(email,name,password,role,demo) VALUES ($1,$2,'',$3,true)
          ON CONFLICT(email) DO UPDATE SET email=EXCLUDED.email RETURNING id`,
          [input.room.toLowerCase()+'.'+input.role+'@demo.invalid',input.role==='worker'?'Asha Jadhav':'Rohan Patil',input.role]);
        await session(jar,account.id);
      } else if (action==='signup') {
        requireThat(!input.email.endsWith('@demo.invalid'),'invalid',400);
        const salt=randomBytes(16).toString('hex');
        const pw=salt+':'+scryptSync(input.password,salt,64).toString('hex');
        const a=await one(db,'INSERT INTO accounts(email,name,password,role,demo) VALUES ($1,$2,$3,$4,$5) RETURNING id',
          [input.email,input.name,pw,input.role,demo()]);
        await session(jar,a.id);
      } else {
        const a=await one(db,'SELECT id,password FROM accounts WHERE email=$1 AND demo=$2',[input.email,demo()]);
        const [salt,digest]=(a?.password || '00000000000000000000000000000000:'+ '00'.repeat(64)).split(':');
        const equal=timingSafeEqual(scryptSync(input.password,salt,64),Buffer.from(digest,'hex'));
        requireThat(equal && a?.password,'credentials',401);
        await session(jar,a.id);
      }
      return reply({ok:true});
    }
    requireThat(user,'signIn',401);
    await throttle('write:'+user.id,90,60);
    if (action==='logout') {
      await db.query('DELETE FROM sessions WHERE token=$1',[hash(jar.get('ks_session').value)]);
      jar.delete('ks_session');
      return reply({ok:true});
    }
    const result=await transaction(async tx=>{
      if (['profile','apply','verify','withdrawCheck'].includes(action)) requireThat(user.role==='worker');
      if (action==='profile') {
        const {category,area,rate,bio,available,point}=input;
        await tx.query(`INSERT INTO profiles VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(account) DO UPDATE SET
          category=excluded.category,area=excluded.area,rate=excluded.rate,bio=excluded.bio,available=excluded.available,lat=excluded.lat,lng=excluded.lng`,
          [user.id,category,area,rate,bio,available,point?.lat??null,point?.lng??null]);
      }
      if (action==='verify') await submitCheck(tx,user,input);
      if (action==='withdrawCheck') await withdrawCheck(tx,user,input.id);
      if (action==='reviewCheck') await decideCheck(tx,user,input);
      if (action==='saveListing') {
        const table=input.kind==='job'?'saved_jobs':'saved_workers';
        if (!input.saved) await tx.query(`DELETE FROM ${table} WHERE account=$1 AND item=$2`,[user.id,input.id]);
        else {
          if (input.kind==='job') {
            const job=await one(tx,`SELECT j.id FROM jobs j JOIN accounts a ON a.id=j.employer
              WHERE j.id=$1 AND a.demo=$2 AND j.closed_at IS NULL AND j.starts>now()
              AND NOT EXISTS (SELECT 1 FROM bookings WHERE job=j.id)`,[input.id,user.demo]);
            requireThat(job,'missing',404);
          } else {
            const worker=await one(tx,`SELECT p.category FROM profiles p JOIN accounts a ON a.id=p.account
              WHERE p.account=$1 AND p.available AND a.demo=$2`,[input.id,user.demo]);
            requireThat(worker && await qualified(tx,input.id,worker.category),'missing',404);
          }
          await tx.query(`INSERT INTO ${table}(account,item) VALUES ($1,$2) ON CONFLICT DO NOTHING`,[user.id,input.id]);
        }
        return {};
      }
      if (action==='editJob' || action==='closeJob') {
        requireThat(user.role==='employer');
        const current=await one(tx,'SELECT * FROM jobs WHERE id=$1 AND employer=$2 FOR UPDATE',[input.id,user.id]);
        requireThat(current,'missing',404);
        const booked=await one(tx,'SELECT job FROM bookings WHERE job=$1',[input.id]);
        requireThat(!booked && !current.closed_at && current.starts>new Date(),'closed',409);
        if (action==='closeJob') {
          await tx.query('UPDATE jobs SET closed_at=now() WHERE id=$1',[input.id]);
          await tx.query("UPDATE applications SET state='declined' WHERE job=$1 AND state='pending'",[input.id]);
        } else {
          requireThat(!(await one(tx,'SELECT id FROM applications WHERE job=$1 LIMIT 1',[input.id])),'jobHasOffers',409);
          requireThat(Date.parse(input.starts)>Date.now(),'future',400);
          const {title,category,area,description,amount,starts,hours,point}=input;
          await tx.query(`UPDATE jobs SET title=$2,category=$3,area=$4,description=$5,amount=$6,starts=$7,hours=$8,
            lat=CASE WHEN $4<>area OR $9::float8 IS NOT NULL THEN $9 ELSE lat END,
            lng=CASE WHEN $4<>area OR $10::float8 IS NOT NULL THEN $10 ELSE lng END WHERE id=$1`,
          [input.id,title,category,area,description,amount,starts,hours,point?.lat??null,point?.lng??null]);
        }
        return {};
      }
      if (action==='job') {
        requireThat(user.role==='employer');
        requireThat(Date.parse(input.starts)>Date.now(),'future',400);
        const {title,category,area,description,amount,starts,hours,point}=input;
        await tx.query('INSERT INTO jobs(employer,title,category,area,description,amount,starts,hours,lat,lng) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
          [user.id,title,category,area,description,amount,starts,hours,point?.lat??null,point?.lng??null]);
      }
      if (action==='apply' || action==='invite') {
        const invite=action==='invite';
        if (invite) requireThat(user.role==='employer');
        const worker=invite?input.worker:user.id;
        const j=await one(tx,'SELECT * FROM jobs WHERE id=$1 FOR UPDATE',[input.job]);
        requireThat(j && !j.closed_at && j.starts>new Date() && !(await one(tx,'SELECT job FROM bookings WHERE job=$1',[j.id])),'closed',409);
        const employer=await one(tx,'SELECT demo FROM accounts WHERE id=$1',[j.employer]);
        requireThat(employer?.demo===user.demo && (!invite || j.employer===user.id),'missing',404);
        const p=await one(tx,`SELECT p.category FROM profiles p JOIN accounts a ON a.id=p.account
          WHERE p.account=$1 AND a.demo=$2 AND a.role='worker' AND ($3=false OR p.available)`,[worker,user.demo,invite]);
        requireThat(p?.category===j.category,'match',409);
        requireThat(await qualified(tx,worker,j.category),'verification',409);
        const x=await one(tx,'INSERT INTO applications(job,worker,amount,author,note) VALUES ($1,$2,$3,$4,$5) RETURNING id',[j.id,worker,input.amount,user.id,input.note]);
        await tx.query('INSERT INTO offer_history(application,version,author,amount,note) VALUES ($1,1,$2,$3,$4)',[x.id,user.id,input.amount,input.note]);
        return {thread:x.id};
      }
      if (!['counter','decide','message','state','location','rate','readThread'].includes(action)) return {};
      const link=await one(tx,`SELECT x.job FROM applications x JOIN jobs j ON j.id=x.job
        WHERE x.id=$1 AND (x.worker=$2 OR j.employer=$2)`,[input.id,user.id]);
      requireThat(link,'missing',404);
      if (action==='readThread') {
        const entry=await one(tx,'SELECT id FROM messages WHERE application=$1 AND id=$2',[input.id,input.message]);
        requireThat(entry,'missing',404);
        await tx.query(`INSERT INTO thread_reads(account,application,seen_message) VALUES ($1,$2,$3)
          ON CONFLICT(account,application) DO UPDATE
          SET seen_message=greatest(thread_reads.seen_message,excluded.seen_message)`,[user.id,input.id,input.message]);
        return {};
      }
      const j=await one(tx,'SELECT * FROM jobs WHERE id=$1 FOR UPDATE',[link.job]);
      const x=await one(tx,'SELECT * FROM applications WHERE id=$1 FOR UPDATE',[input.id]);
      const b=await one(tx,'SELECT * FROM bookings WHERE application=$1 FOR UPDATE',[x.id]);
      if (action==='counter' || action==='decide') {
        requireThat(x.state==='pending' && !j.closed_at && j.starts>new Date(),'closed',409);
        requireThat(x.version===input.version && x.author!==user.id,'turn',409);
      }
      if (action==='counter') {
        const version=x.version+1;
        await tx.query('UPDATE applications SET amount=$1,author=$2,note=$3,version=$4 WHERE id=$5',[input.amount,user.id,input.note,version,x.id]);
        await tx.query('INSERT INTO offer_history(application,version,author,amount,note) VALUES ($1,$2,$3,$4,$5)',[x.id,version,user.id,input.amount,input.note]);
      }
      if (action==='decide') {
        if (input.decision==='accept') {
          requireThat(await qualified(tx,x.worker,j.category),'verification',409);
          await tx.query('INSERT INTO bookings(application,job,amount) VALUES ($1,$2,$3)',[x.id,j.id,x.amount]);
          await tx.query("INSERT INTO booking_events(application,author,state) VALUES ($1,$2,'confirmed')",[x.id,user.id]);
          await tx.query("UPDATE applications SET state='declined' WHERE job=$1 AND id<>$2 AND state='pending'",[j.id,x.id]);
        }
        await tx.query('UPDATE applications SET state=$1 WHERE id=$2',[input.decision==='accept'?'accepted':'declined',x.id]);
      }
      if (action==='message') {
        requireThat(x.state!=='declined','closed',409);
        await tx.query('INSERT INTO messages(application,author,body) VALUES ($1,$2,$3)',[x.id,user.id,input.body]);
      }
      if (action==='state') {
        const allowed=b && Object.hasOwn(transitions[b.state]||{},input.state) && transitions[b.state][input.state];
        requireThat(allowed && (allowed==='either'||allowed===user.role),'transition',409);
        await tx.query('UPDATE bookings SET state=$1,lat=NULL,lng=NULL,located_at=NULL WHERE application=$2',[input.state,x.id]);
        await tx.query('INSERT INTO booking_events(application,author,state) VALUES ($1,$2,$3)',[x.id,user.id,input.state]);
      }
      if (action==='rate') {
        requireThat(j.employer===user.id);
        requireThat(b?.state==='completed','ratingUnavailable',409);
        await tx.query('INSERT INTO worker_ratings(application,worker,score,note) VALUES ($1,$2,$3,$4)',
          [input.id,x.worker,input.score,input.note??null]);
      }
      if (action==='location') {
        requireThat(x.worker===user.id && b?.state==='en_route');
        await tx.query('UPDATE bookings SET lat=$1,lng=$2,located_at=$3 WHERE application=$4',
          [input.point?.lat??null,input.point?.lng??null,input.point?new Date():null,x.id]);
      }
      return {};
    });
    return reply({ok:true,...result});
  } catch(error) { return failure(error); }
}