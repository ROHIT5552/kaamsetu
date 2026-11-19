import { z } from 'zod';
import { openDatabase } from '../lib/connection.mjs';

const [command,value]=process.argv.slice(2);
if (!['grant','revoke'].includes(command) || !z.uuid().safeParse(value).success) {
  throw new Error('Usage: npm run verification:reviewer -- grant|revoke ACCOUNT_UUID');
}
if (process.env.DEMO_MODE==='true') throw new Error('Use a non-demo environment.');
const db=openDatabase();
try {
  const result=command==='grant'
    ? await db.query(`INSERT INTO verification_reviewers(account)
        SELECT id FROM accounts WHERE id=$1 AND NOT demo AND role='employer'
        ON CONFLICT(account) DO NOTHING`,[value])
    : await db.query('DELETE FROM verification_reviewers WHERE account=$1',[value]);
  console.log(result.rowCount?'Reviewer access updated.':'No reviewer access changed.');
} finally {await db.end();}