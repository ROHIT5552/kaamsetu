import { openDatabase } from '../lib/connection.mjs';
if (process.env.DEMO_MODE !== 'true') throw new Error('Demo mode required');
const storage=openDatabase();
const db=await storage.connect();
try {
  await db.query('BEGIN');
  const people=[
    ['Asha Jadhav','plumbing','CIDCO',35000,'Leak detection, tap replacement and bathroom fittings.',19.877,75.369],
    ['Nilesh Shinde','electrical','Chikalthana',45000,'Fan fittings, lighting and troubleshooting for homes.',19.870,75.412],
    ['Savita More','painting','Aurangpura',30000,'Wall preparation, touch-ups and repainting.',19.889,75.325],
    ['Imran Shaikh','carpentry','Waluj MIDC',40000,'Door repairs, cabinet adjustments and furniture assembly.',19.837,75.236],
    ['Meera Pawar','general','Beed Bypass',25000,'Help with moves, lifting and household tasks.',19.847,75.364],
    ['Vishal Gaikwad','masonry','Kranti Chowk',50000,'Tile patches and small masonry repairs.',19.873,75.334]
  ];
  for (const [i,[name,category,area,rate,bio,lat,lng]] of people.entries()) {
    const {rows:[account]}=await db.query(`INSERT INTO accounts(email,name,password,role,demo)
      VALUES ($1,$2,'','worker',true) ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name RETURNING id`,['sample'+i+'@demo.invalid',name]);
    await db.query('INSERT INTO profiles VALUES ($1,$2,$3,$4,$5,true,$6,$7) ON CONFLICT(account) DO NOTHING',[account.id,category,area,rate,bio,lat,lng]);
    for (const kind of category==='electrical'?['identity','electrical-license']:['identity']) {
      await db.query("INSERT INTO credentials VALUES ($1,$2,$3,'seed',now()) ON CONFLICT DO NOTHING",[account.id,kind,kind==='identity'?'alternative':'trade']);
    }
  }
  const {rows:[employer]}=await db.query(`INSERT INTO accounts(email,name,password,role,demo)
    VALUES ('sample-employer@demo.invalid','Pilot listings','','employer',true)
    ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name RETURNING id`);
  const jobs=[
    ['Replace a leaking kitchen tap','plumbing','CIDCO','Check the connection and replace the tap washer.',65000,2,19.88,75.37],
    ['Install two ceiling fans','electrical','Chikalthana','Existing wiring is in place. Bring your own tools.',120000,3,19.87,75.41],
    ['Touch up a living room wall','painting','Aurangpura','Patch small marks and repaint one wall. Paint is provided.',100000,4,19.89,75.33]
  ];
  for (const [i,[title,category,area,description,amount,hours,lat,lng]] of jobs.entries()) {
    await db.query(`INSERT INTO jobs(id,employer,title,category,area,description,amount,starts,hours,lat,lng)
      VALUES ($1,$2,$3,$4,$5,$6,$7,now()+interval '7 days',$8,$9,$10)
      ON CONFLICT(id) DO UPDATE SET starts=EXCLUDED.starts`,
      ['00000000-0000-4000-8000-00000000000'+i,employer.id,title,category,area,description,amount,hours,lat,lng]);
  }
  await db.query('COMMIT');
  console.log('Sample workers and jobs are ready.');
} finally {db.release(); await storage.end();}