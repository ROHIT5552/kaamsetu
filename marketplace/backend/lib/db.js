import { openDatabase } from './connection.mjs';
export function pool() {
  return globalThis.swabhimanPool ??= openDatabase();
}
export async function transaction(action) {
  const db = await pool().connect();
  try {
    await db.query('BEGIN');
    const result = await action(db);
    await db.query('COMMIT');
    return result;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
  }
}