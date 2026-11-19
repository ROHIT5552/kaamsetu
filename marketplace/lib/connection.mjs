import pg from 'pg';
export function openDatabase() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  return new pg.Pool({connectionString:process.env.DATABASE_URL,max:10,statement_timeout:5000});
}