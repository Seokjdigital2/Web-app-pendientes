// "Consejero" del Gantt: avisos y sugerencias para no retrabajar y no
// perder de vista lo atrasado, calculados en vivo (nada de cron ni cola
// aparte) a partir del mismo estado que ya alimenta la tabla.
import { categoriesFor, isOverdue, todayStr } from './gantt';

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordOverlap(a, b) {
  const wa = new Set(norm(a).split(' ').filter((w) => w.length > 3));
  const wb = new Set(norm(b).split(' ').filter((w) => w.length > 3));
  if (!wa.size || !wb.size) return 0;
  let hits = 0;
  wa.forEach((w) => { if (wb.has(w)) hits++; });
  return hits / Math.min(wa.size, wb.size);
}

// Candidatos a "esto ya existe" para el mismo cliente, para avisar antes de
// crear un duplicado en vez de después.
export function findPossibleDuplicates(activity, openTasksForClient) {
  if (!activity || !activity.trim()) return [];
  return (openTasksForClient || [])
    .filter((t) => t.status !== 'Hecho' && t.activity)
    .map((t) => ({ t, score: wordOverlap(activity, t.activity) }))
    .filter((x) => x.score >= 0.6)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.t);
}

// Sugiere de qué tarea abierta depender: busca, dentro del mismo cliente +
// tipo de proyecto, la tarea sin terminar más reciente de la categoría
// inmediatamente anterior en el flujo (Antes → Durante → Después).
export function suggestDependsOn(projectType, category, openTasksForClient) {
  if (!projectType || !category) return null;
  const order = categoriesFor(projectType);
  const idx = order.indexOf(category);
  if (idx <= 0) return null;
  for (let i = idx - 1; i >= 0; i--) {
    const candidates = (openTasksForClient || []).filter((t) => t.category === order[i] && t.status !== 'Hecho');
    if (candidates.length) return candidates[candidates.length - 1];
  }
  return null;
}

// Avisos para todo el tablero: atrasadas sin fecha nueva (sin margen de
// gracia) y clientes que se quedaron sin ninguna próxima fecha planeada.
export function advisorWarnings(clientTaskLists, todayISO = todayStr()) {
  const overdueByClient = [];
  const planningGaps = [];
  clientTaskLists.forEach(({ client, tasks }) => {
    const overdue = tasks.filter((t) => isOverdue(t, todayISO));
    if (overdue.length) overdueByClient.push({ client, tasks: overdue });
    const open = tasks.filter((t) => t.status !== 'Hecho');
    const hasNext = open.some((t) => (t.end || t.start) >= todayISO);
    if (open.length && !hasNext) planningGaps.push(client);
  });
  return { overdueByClient, planningGaps };
}
