import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Falta DATABASE_URL en el entorno. Ejemplo: DATABASE_URL=... npm run db:migrate');
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);
  const schema = readFileSync(path.join(__dirname, '../lib/schema.sql'), 'utf8');
  const statements = schema.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    await sql(stmt);
    console.log('OK:', stmt.slice(0, 60).replace(/\n/g, ' ') + '...');
  }
  console.log('Migración completa.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
