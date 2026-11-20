import { openDatabase } from '../lib/connection.mjs';

const db = openDatabase();
try {
  const workers = await db.query("SELECT a.id, p.category FROM accounts a JOIN profiles p ON p.account = a.id");
  for (const w of workers.rows) {
    await db.query(`
      INSERT INTO verification_cases(account, kind, method, status, provider_result, consent_version, valid_until)
      VALUES ($1, 'identity', 'alternative', 'approved', 'passed', '2026-11-v1', now() + interval '1 year')
      ON CONFLICT DO NOTHING
    `, [w.id]);
    if (w.category === 'electrical') {
      await db.query(`
        INSERT INTO verification_cases(account, kind, method, status, provider_result, consent_version, valid_until)
        VALUES ($1, 'electrical-license', 'trade', 'approved', 'passed', '2026-11-v1', now() + interval '1 year')
        ON CONFLICT DO NOTHING
      `, [w.id]);
    }
  }
  const count = await db.query('SELECT count(*) FROM verification_cases');
  console.log('Approved verification cases in Neon:', count.rows[0].count);
} finally {
  await db.end();
}
