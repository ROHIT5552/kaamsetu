import { randomBytes,scryptSync } from 'node:crypto';
import { openDatabase } from '../lib/connection.mjs';

if (process.env.DEMO_MODE!=='true' || !/^http:\/\/localhost:\d+$/.test(process.env.APP_ORIGIN||'')) {
  throw new Error('Seeding requires localhost demo mode.');
}
function hashPassword(password) {
  if (!password) return '';
  const salt=randomBytes(16).toString('hex');
  return salt+':'+scryptSync(password,salt,64).toString('hex');
}
const demoPasswords=['TradeDemo!2026','ElectricDemo!2026'];
const people=[
  ['Asha Jadhav','plumbing','CIDCO',350,'Leak detection, tap replacement and bathroom fittings.',19.877,75.369],
  ['Nilesh Shinde','electrical','Chikalthana',450,'Fan fittings, lighting and troubleshooting for homes.',19.870,75.412],
  ['Savita More','painting','Aurangpura',300,'Wall preparation, touch-ups and repainting.',19.889,75.325],
  ['Imran Shaikh','carpentry','Waluj MIDC',400,'Door repairs, cabinets and furniture assembly.',19.837,75.236],
  ['Meera Pawar','general','Beed Bypass',250,'Help with moves, lifting and household tasks.',19.847,75.364],
  ['Vishal Gaikwad','masonry','Kranti Chowk',500,'Tile patches and small masonry repairs.',19.873,75.334],
  ['Ramesh Kale','plumbing','Shendra',380,'Basin installations and pipe repairs.',19.884,75.493],
  ['Jyoti Patil','electrical','CIDCO',420,'Troubleshooting switches, fans and household lights.',19.881,75.372],
  ['Farida Khan','painting','Waluj MIDC',340,'Interior painting and preparation for rented homes.',19.841,75.232],
  ['Prakash Wagh','carpentry','Aurangpura',460,'Furniture repairs and made-to-measure shelves.',19.888,75.327],
  ['Kavita Rathod','general','Shendra',260,'Packing, inventory sorting and household help.',19.877,75.488],
  ['Suresh Chavan','masonry','Beed Bypass',470,'Wall repairs and broken floor tile replacement.',19.846,75.361],
  ['Rekha Salve','plumbing','Chikalthana',390,'Leaking taps, drains and fixture replacement.',19.872,75.418],
  ['Adil Qureshi','electrical','Waluj MIDC',480,'Indoor lighting and appliance point checks.',19.836,75.239],
  ['Pooja Deshmukh','painting','Beed Bypass',320,'Low-odour coatings and careful masking.',19.850,75.358],
  ['Omkar Bhosale','carpentry','Shendra',410,'Door alignment and flat-pack assembly.',19.882,75.491],
  ['Sana Pathan','general','Kranti Chowk',280,'Small moves, event setup and cleanup.',19.875,75.336],
  ['Dinesh Kamble','masonry','CIDCO',510,'Small tile, plaster and brickwork repairs.',19.883,75.377],
  ['Ganesh Khade','plumbing','Kranti Chowk',330,'Kitchen plumbing and water fixture maintenance.',19.871,75.331],
  ['Anita Gite','painting','Chikalthana',360,'Wall coating and exterior touch-ups.',19.874,75.409]
];
const jobs=[
  ['Replace a leaking kitchen tap',0,650,2,'Check the connection and replace the tap washer.'],
  ['Install two ceiling fans',1,1200,3,'Existing wiring is in place. Bring your own tools.'],
  ['Touch up a living room wall',2,1000,4,'Patch small marks and repaint one wall. Paint is provided.'],
  ['Fit shelves in a kitchen alcove',3,1500,4,'Install two shelves. The brackets are available on site.'],
  ['Help pack and move boxes',4,750,3,'Carry boxes from the flat to a parked vehicle.'],
  ['Replace three loose floor tiles',5,1600,4,'Remove the loose tiles and install the spare tiles provided.'],
  ['Fix a slow bathroom drain',6,850,2,'Identify the blockage and check the drain connections.'],
  ['Replace an outdoor light fitting',7,900,2,'Install a weather-resistant wall fitting at the entrance.'],
  ['Paint a small shopfront',8,2100,6,'Prep the surface and apply two coats to the shutter and trim.'],
  ['Adjust two cabinet doors',9,800,2,'Realign the hinges and check that both doors close evenly.']
];
const reviews=[
  [5,'Found the leak quickly and left the kitchen clean.'],
  [5,'Explained the issue clearly and tested both fans before leaving.'],
  [4,'Careful masking and a tidy finish on the walls.'],
  [5,'The shelves fit neatly and the work finished on time.'],
  [5,'Arrived promptly and handled the boxes carefully.'],
  [4,'The replacement tiles sit level and match the surrounding floor.']
];
const sampleId=(group,index)=>`00000000-0000-4000-8000-${String(group*100+index).padStart(12,'0')}`;
const storage=openDatabase();
const db=await storage.connect();
try {
  await db.query('BEGIN');
  const workerIds=[];
  for(const [i,[name,category,area,rate,bio,lat,lng]] of people.entries()){
    const {rows:[account]}=await db.query(`INSERT INTO accounts(email,name,password,role,demo)
      VALUES ($1,$2,$3,'worker',true) ON CONFLICT(email) DO UPDATE SET
      name=EXCLUDED.name,password=EXCLUDED.password WHERE accounts.demo RETURNING id`,
    ['sample'+i+'@demo.invalid',name,hashPassword(demoPasswords[i])]);
    workerIds.push(account.id);
    await db.query('INSERT INTO profiles(account,category,area,rate,bio,available,lat,lng) VALUES ($1,$2,$3,$4,$5,true,$6,$7) ON CONFLICT(account) DO NOTHING',
      [account.id,category,area,rate*100,bio,lat,lng]);
    for(const kind of category==='electrical'?['identity','electrical-license']:['identity']){
      await db.query("INSERT INTO credentials VALUES ($1,$2,$3,'seed',now()) ON CONFLICT DO NOTHING",
        [account.id,kind,kind==='identity'?'alternative':'trade']);
    }
  }
  const {rows:[employer]}=await db.query(`INSERT INTO accounts(email,name,password,role,demo)
    VALUES ('sample-employer@demo.invalid','Rohan Patil',$1,'employer',true)
    ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,password=EXCLUDED.password WHERE accounts.demo RETURNING id`,
  [hashPassword('HireDemo!2026')]);
  for(const [i,[title,worker,rupees,hours,description]] of jobs.entries()){
    const [,category,area,,,lat,lng]=people[worker];
    await db.query(`INSERT INTO jobs(id,employer,title,category,area,description,amount,starts,hours,lat,lng)
      VALUES ($1,$2,$3,$4,$5,$6,$7,now()+($8::int * interval '1 day'),$9,$10,$11)
      ON CONFLICT(id) DO UPDATE SET starts=EXCLUDED.starts,lat=EXCLUDED.lat,lng=EXCLUDED.lng WHERE jobs.closed_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM bookings WHERE job=jobs.id)
      AND NOT EXISTS (SELECT 1 FROM applications WHERE job=jobs.id)`,
    [sampleId(0,i),employer.id,title,category,area,description,rupees*100,2+i,hours,lat,lng]);
  }
  for(const [i,[score,note]] of reviews.entries()){
    const [title,,rupees,hours,description]=jobs[i];
    const [,category,area]=people[i];
    const job=sampleId(1,i), thread=sampleId(2,i),worker=workerIds[i];
    await db.query(`INSERT INTO jobs(id,employer,title,category,area,description,amount,starts,hours)
      VALUES ($1,$2,$3,$4,$5,$6,$7,now()-interval '3 days',$8) ON CONFLICT DO NOTHING`,
    [job,employer.id,title,category,area,description,rupees*100,hours]);
    const app=await db.query(`INSERT INTO applications(id,job,worker,amount,author,state,note)
      VALUES ($1,$2,$3,$4,$3,'accepted','Confirmed demo offer') ON CONFLICT DO NOTHING`,[thread,job,worker,rupees*100]);
    if(app.rowCount){
      await db.query('INSERT INTO offer_history(application,version,author,amount,note) VALUES ($1,1,$2,$3,$4)',
        [thread,worker,rupees*100,'Confirmed demo offer']);
      await db.query("INSERT INTO bookings(application,job,amount,state) VALUES ($1,$2,$3,'completed')",[thread,job,rupees*100]);
      for(const [index,state] of ['confirmed','en_route','arrived','in_progress','completed'].entries()){
        await db.query(`INSERT INTO booking_events(application,author,state,created)
          SELECT $1,$2,$3,starts+($5::int * interval '45 minutes') FROM jobs WHERE id=$4`,
        [thread,index===1||index===2?worker:employer.id,state,job,index]);
      }
    }
    await db.query(`INSERT INTO worker_ratings(application,worker,score,note,created_at)
      VALUES ($1,$2,$3,$4,now()-interval '2 days') ON CONFLICT DO NOTHING`,[thread,worker,score,note]);
  }
  await db.query('COMMIT');
  console.log('Seeded 20 sample workers, 10 job listings, 6 completed-booking reviews and 3 demo logins.');
} catch(error) {
  await db.query('ROLLBACK');
  throw error;
} finally {
  db.release();
  await storage.end();
}