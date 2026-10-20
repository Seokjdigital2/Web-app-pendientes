// Reporte de solo lectura: agrupa tareas del Gantt por cliente + nombre
// normalizado y señala grupos sospechosos de ser duplicados, con sus
// diferencias, para que alguien los revise. Nunca borra ni fusiona nada.
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// actividades que legítimamente se repiten (recurrentes semanales/mensuales,
// o "link building" que ya se trata en el panel como una serie de pasos) —
// no las reportamos como duplicados solo por compartir nombre.
const RECURRING_HINTS = [/\bweekly\b/, /reuni[oó]n/, /revisi[oó]n de redes/, /link\s*building/, /blogs? mensual/];

async function main() {
  const tasks = await sql('SELECT * FROM tasks ORDER BY client, activity');
  const groups = new Map();
  for (const t of tasks) {
    const key = `${t.client}::${norm(t.activity)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }

  const suspects = [];
  for (const [key, group] of groups) {
    if (group.length < 2) continue;
    const activity = group[0].activity || '';
    if (RECURRING_HINTS.some((re) => re.test(activity.toLowerCase()))) continue;
    // si cada una tiene una fecha de inicio distinta y clara, es más probable
    // que sean ejecuciones separadas de una actividad recurrente no detectada
    // arriba que un duplicado real — igual se reportan, pero marcadas.
    const dates = new Set(group.map((t) => t.start || ''));
    suspects.push({
      client: group[0].client,
      activity,
      count: group.length,
      likelyRecurring: dates.size === group.length && dates.size > 1 && ![...dates].includes(''),
      tasks: group.map((t) => ({
        id: t.id,
        start: t.start,
        end: t.end,
        status: t.status,
        resp: t.resp,
        source: t.source,
        note: t.note,
      })),
    });
  }

  if (!suspects.length) {
    console.log('No se encontraron grupos sospechosos de duplicado.');
    return;
  }

  console.log(`${suspects.length} grupo(s) sospechoso(s) de duplicado (revisar, no se modificó nada):\n`);
  for (const s of suspects) {
    console.log(`— [${s.client}] "${s.activity}" × ${s.count}${s.likelyRecurring ? '  (posible recurrencia no marcada, revisar con cuidado)' : ''}`);
    for (const t of s.tasks) {
      console.log(`    ${t.id}  start=${t.start || '—'} end=${t.end || '—'} status=${t.status}  resp="${t.resp}"  source="${t.source}"`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
