import { readFile } from 'node:fs/promises';
import { openDatabase } from '../lib/connection.mjs';
const db = openDatabase();
try {
  await db.query(await readFile(new URL('../db/schema.sql',import.meta.url),'utf8'));
  await db.query(await readFile(new URL('../db/verification.sql',import.meta.url),'utf8'));
  await db.query(await readFile(new URL('../db/marketplace.sql',import.meta.url),'utf8'));
  console.log('SWABHIMAN schema is ready.');
} finally {
  await db.end();
}