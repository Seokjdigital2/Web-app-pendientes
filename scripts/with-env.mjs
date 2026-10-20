import { readFileSync } from 'fs';

const envPath = new URL('../.env.local', import.meta.url);
const content = readFileSync(envPath, 'utf8');
for (const line of content.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const value = trimmed.slice(idx + 1).trim();
  if (!(key in process.env)) process.env[key] = value;
}

const target = process.argv[2];
await import(target);
