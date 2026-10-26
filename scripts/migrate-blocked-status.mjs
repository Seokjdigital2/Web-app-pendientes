// "Bloqueado" deja de ser un estatus que se guarda a mano: ahora se calcula
// solo a partir de "Depende de" (ver isDependencyBlocked en GanttTab.jsx).
// Esto pasa las tareas/pendientes que ya estaban marcados "Bloqueado" a un
// estatus real, guardando el motivo viejo (si tenía) en las observaciones
// para no perder esa información.
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

async function migrateTasks() {
  const rows = await sql("SELECT id, progress, note, blocked_reason FROM tasks WHERE status = 'Bloqueado'");
  for (const r of rows) {
    const newStatus = r.progress > 0 ? 'En proceso' : 'Pendiente';
    const reasonLine = r.blocked_reason ? `Bloqueo anterior: ${r.blocked_reason}` : '';
    const newNote = [r.note, reasonLine].filter(Boolean).join('\n');
    await sql('UPDATE tasks SET status=$1, note=$2, blocked_reason=$3 WHERE id=$4', [newStatus, newNote, '', r.id]);
    console.log(`tasks:${r.id} -> ${newStatus}${reasonLine ? ' (motivo movido a observaciones)' : ''}`);
  }
  return rows.length;
}

async function migrateItems() {
  const rows = await sql("SELECT id, description FROM items WHERE status = 'Bloqueado'");
  for (const r of rows) {
    const newStatus = 'Pendiente';
    await sql('UPDATE items SET status=$1 WHERE id=$2', [newStatus, r.id]);
    console.log(`items:${r.id} -> ${newStatus}`);
  }
  return rows.length;
}

async function main() {
  const t = await migrateTasks();
  const i = await migrateItems();
  console.log(`\nListo: ${t} tareas y ${i} pendientes migrados.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
