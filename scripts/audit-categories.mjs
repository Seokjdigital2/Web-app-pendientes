import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const tasks = await sql('SELECT id, client, category, activity, project_type FROM tasks');
const items = await sql("SELECT id, client, category, activity, p FROM items WHERE status != 'Hecho' AND is_history = false OR category != ''");

const byCat = {};
for (const t of tasks) {
  const k = t.category || '(vacío)';
  (byCat[k] = byCat[k] || []).push(`[task] ${t.client}: ${t.activity}`);
}
for (const i of items) {
  const k = i.category || '(vacío)';
  (byCat[k] = byCat[k] || []).push(`[item] ${i.client}: ${i.activity}`);
}

console.log(`Total tasks: ${tasks.length}, items relevantes: ${items.length}`);
console.log(`Categorías distintas: ${Object.keys(byCat).length}\n`);
Object.entries(byCat).sort((a, b) => b[1].length - a[1].length).forEach(([cat, examples]) => {
  console.log(`=== "${cat}" (${examples.length}) ===`);
  examples.slice(0, 3).forEach((e) => console.log('  ' + e));
});
