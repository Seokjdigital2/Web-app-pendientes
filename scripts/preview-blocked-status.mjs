import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

async function main() {
  const tasksRows = await sql("SELECT id, client, activity, progress, blocked_reason FROM tasks WHERE status = 'Bloqueado'");
  const itemsRows = await sql("SELECT id, client, activity FROM items WHERE status = 'Bloqueado'");
  console.log(`tasks Bloqueado: ${tasksRows.length}`);
  tasksRows.forEach((r) => console.log(`  - ${r.id} (${r.client}) "${r.activity}" progreso=${r.progress} motivo="${r.blocked_reason || ''}"`));
  console.log(`items Bloqueado: ${itemsRows.length}`);
  itemsRows.forEach((r) => console.log(`  - ${r.id} (${r.client}) "${r.activity}"`));
}

main().catch((e) => { console.error(e); process.exit(1); });
