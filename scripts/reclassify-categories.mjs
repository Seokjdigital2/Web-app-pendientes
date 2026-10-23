// Reclasifica las categorías libres que existían antes de definir la
// taxonomía final, y asigna Tipo de proyecto donde se puede inferir con
// confianza. No inventa nada para lo que ya estaba vacío y es ambiguo —
// esos quedan reportados al final para revisión manual.
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// oldCategory -> { category: nueva categoría, projectType: tipo sugerido
// (se usa solo si el cliente tiene más de un tipo de proyecto; si el
// cliente es de un solo tipo, ese tipo manda siempre) }
const MAP = {
  'Indexación': { category: 'Técnico SEO', projectType: 'SEO' },
  'Redirecciones': { category: 'Técnico SEO', projectType: 'SEO' },
  'Desarrollo': { category: 'Técnico SEO', projectType: 'SEO' },
  'Blog': { category: 'Blog', projectType: 'SEO' },
  'URLs y categorías': { category: 'On-page', projectType: 'SEO' },
  'Rendimiento': { category: 'Técnico SEO', projectType: 'SEO' },
  'Diseño': { category: 'On-page', projectType: 'SEO' },
  'Revisión del plan': { category: 'Weekly/Revisión', projectType: 'SEO' },
  'Contenido': { category: 'Blog', projectType: 'SEO' },
  'Imágenes': { category: 'On-page', projectType: 'SEO' },
  'Medición': { category: 'Técnico SEO', projectType: 'SEO' },
  'Validación': { category: 'On-page', projectType: 'SEO' },
  'Auditoría': { category: 'Técnico SEO', projectType: 'SEO' },
  'Optimización web': { category: 'Desarrollo', projectType: 'Diseño Web' },

  'Curación': { category: 'Edición', projectType: 'RRSS' },
  'Ingeniería inversa y base de conocimiento': { category: 'Estrategia', projectType: 'RRSS' },
  'Automatización': { category: 'Producción', projectType: 'RRSS' },
  'Guiones': { category: 'Guion', projectType: 'RRSS' },
  'Grabación': { category: 'Producción', projectType: 'RRSS' },
  'Publicación': { category: 'Publicación', projectType: 'RRSS' },
  'Seguimiento': { category: 'Métricas', projectType: 'RRSS' },
  'Optimización': { category: 'Producción', projectType: 'RRSS' },
  'Contenido web': { category: 'Blog', projectType: 'SEO' },
  'Dashboard': { category: 'Métricas', projectType: 'RRSS' },
  'Planeación': { category: 'Estrategia', projectType: 'SEO' },
  'Edición': { category: 'Edición', projectType: 'RRSS' },
  'Revisión SEO': { category: 'Weekly/Revisión', projectType: 'SEO' },
  'Presencia en Google': { category: 'Técnico SEO', projectType: 'SEO' },
  'Diagnóstico': { category: 'Métricas', projectType: 'RRSS' },
  'Gestión de materiales': { category: 'Producción', projectType: 'RRSS' },
  'Navegación': { category: 'Desarrollo', projectType: 'Diseño Web' },
  'Accesos': { category: 'Alta de cuentas', projectType: '' },
  'Promoción del webinar': { category: 'Publicación', projectType: 'RRSS' },
  'Webinar y replay': { category: 'Producción', projectType: 'RRSS' },
  'Revisión': { category: 'Weekly/Revisión', projectType: '' },
};

async function run(table, idCol) {
  const clients = await sql('SELECT id, name, project_types FROM clients');
  const clientById = Object.fromEntries(clients.map((c) => [c.id, c]));
  // items.client guarda el NOMBRE, no el id; arma también un índice por nombre.
  const clientByName = Object.fromEntries(clients.map((c) => [c.name, c]));

  const rows = await sql(`SELECT ${idCol} AS id, client, category, project_type FROM ${table}`);
  let updated = 0;
  const unresolved = [];
  for (const r of rows) {
    if (!r.category || !MAP[r.category]) continue;
    const client = clientById[r.client] || clientByName[r.client];
    const types = client?.project_types || [];
    const mapping = MAP[r.category];
    let projectType = r.project_type || '';
    if (!projectType) {
      if (types.length === 1) projectType = types[0];
      else if (mapping.projectType) projectType = mapping.projectType;
      else unresolved.push(`${table}:${r.id} (${r.client}) — categoría "${r.category}" sin tipo de proyecto claro`);
    }
    await sql(`UPDATE ${table} SET category=$1, project_type=$2 WHERE ${idCol}=$3`, [mapping.category, projectType, r.id]);
    updated++;
  }
  return { updated, unresolved, total: rows.length };
}

async function main() {
  const tasksResult = await run('tasks', 'id');
  const itemsResult = await run('items', 'id');
  console.log(`tasks: ${tasksResult.updated}/${tasksResult.total} reclasificadas`);
  console.log(`items: ${itemsResult.updated}/${itemsResult.total} reclasificadas`);
  const unresolved = [...tasksResult.unresolved, ...itemsResult.unresolved];
  if (unresolved.length) {
    console.log(`\n${unresolved.length} sin tipo de proyecto claro (quedaron con la categoría nueva pero sin tipo):`);
    unresolved.forEach((u) => console.log('  - ' + u));
  }

  // clientes de un solo tipo: asigna ese tipo a TODAS sus tareas/items que
  // todavía no tengan project_type (sin tocar category, no hay nada que
  // adivinar ahí si ya estaba vacía).
  const clients = await sql('SELECT id, name, project_types FROM clients');
  for (const c of clients) {
    if ((c.project_types || []).length !== 1) continue;
    const type = c.project_types[0];
    const r1 = await sql("UPDATE tasks SET project_type=$1 WHERE client=$2 AND (project_type IS NULL OR project_type='') RETURNING id", [type, c.id]);
    const r2 = await sql("UPDATE items SET project_type=$1 WHERE client=$2 AND (project_type IS NULL OR project_type='') RETURNING id", [type, c.name]);
    if (r1.length || r2.length) console.log(`${c.name}: +${r1.length} tasks, +${r2.length} items -> project_type=${type}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
