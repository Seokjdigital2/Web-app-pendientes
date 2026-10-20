import { neon } from '@neondatabase/serverless';

let cached;
export function sql(...args) {
  if (!cached) {
    if (!process.env.DATABASE_URL) {
      throw new Error('Falta DATABASE_URL (conecta la base de datos Neon en Vercel)');
    }
    cached = neon(process.env.DATABASE_URL);
  }
  return cached(...args);
}
