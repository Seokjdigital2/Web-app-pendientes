// Lógica pura del Gantt de clientes, portada de la pestaña #gx del panel original.
import { colorForClient, nextOccurrence } from './logic.js';

export const DAY = 86400000;
export const N = 35; // ventana de 5 semanas (escala "día", compatibilidad hacia atrás)

// Escalas de zoom del cronograma: cambian solo cuántos días caben en pantalla
// y el ancho de cada día en px — nunca las fechas reales de las tareas, que
// siempre se posicionan con el mismo cálculo (días reales * pxPerDay).
export const SCALES = {
  dia: { label: 'Día', pxPerDay: 28, days: 35 },
  semana: { label: 'Semana', pxPerDay: 40 / 7, days: 12 * 7 },
  mes: { label: 'Mes', pxPerDay: 90 / 30, days: 365 },
};
const MON = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const DOW = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
// "Bloqueado" no es un estatus que se elige a mano: se calcula solo, a
// partir de "Depende de" + que esa otra actividad no esté Hecho (ver
// `dependencyPending` en GanttTab.jsx). Por eso no vive en esta lista.
export const STATUSES = ['Pendiente', 'En proceso', 'En aprobación', 'Pospuesto', 'Hecho'];
export const SKEY = { Pendiente: 'p', 'En proceso': 'e', 'En aprobación': 'a', Hecho: 'h', 'Por confirmar': 'c', Pospuesto: 'x', Cancelado: 'x' };
const DN = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

// PMO multidisciplinario (KJ Publicidad): tipos de proyecto, prioridad y
// taxonomía de categorías por fase (antes/durante/después), definidas con
// el cliente para que el Gantt razone como un consejero de operación, no
// solo como una lista de tareas.
export const PROJECT_TYPES = ['SEO', 'RRSS', 'Diseño Web', 'Ads/SEM', 'Interno'];

export const PRIORITIES = [
  ['1', '1 · Inamovible'],
  ['2', '2 · Importante'],
  ['3', '3 · Movible'],
];

export const FREQ_LABELS = [
  ['', 'One-shot'],
  ['Diaria', 'Diaria'],
  ['Semanal', 'Semanal'],
  ['Quincenal', 'Quincenal'],
  ['Mensual', 'Mensual'],
  ['Mensual (1er lunes)', 'Mensual · 1er lunes'],
];

export const CATEGORY_TAXONOMY = {
  Antes: ['Alta de cuentas', 'Brief', 'Contrato/NDA', 'Onboarding'],
  SEO: ['Estrategia', 'On-page', 'Blog', 'Técnico SEO', 'Link building', 'Publicación'],
  RRSS: ['Estrategia', 'Guion', 'Producción', 'Edición', 'Publicación', 'Community'],
  'Diseño Web': ['Estrategia', 'UX/Wireframe', 'UI Diseño', 'Desarrollo', 'QA', 'Publicación'],
  'Ads/SEM': ['Configurar cuenta', 'Estrategia Ads', 'Creativos Ads', 'Config. campaña', 'Optimización Ads'],
  Interno: ['Prospección', 'Estrategia', 'On-page', 'Blog', 'Técnico SEO', 'Link building', 'Publicación'],
  Después: ['Weekly/Revisión', 'Reporte', 'Métricas', 'Cobranza'],
};

export function categoriesFor(projectType) {
  return [...(CATEGORY_TAXONOMY.Antes || []), ...(CATEGORY_TAXONOMY[projectType] || []), ...(CATEGORY_TAXONOMY.Después || [])];
}

export function allCategoryOptions() {
  const seen = new Set();
  Object.values(CATEGORY_TAXONOMY).forEach((list) => list.forEach((c) => seen.add(c)));
  return [...seen];
}

export const OBJECTIVE_TEMPLATES = {
  SEO: 'Aumentar tráfico orgánico y mejorar el posicionamiento de las páginas/productos pilar definidos en la estrategia, medido contra la línea base del trimestre anterior.',
  RRSS: 'Aumentar alcance, seguidores y engagement de forma sostenida, con retención de audiencia medida mes a mes.',
  'Diseño Web': 'Tener un sitio funcional, rápido y bien conectado con SEO y RRSS.',
  'Ads/SEM': 'Generar conversiones (leads o ventas) a un costo por resultado dentro del rango acordado con el cliente.',
  Interno: 'Mantener la operación y prospección de la agencia alineadas a sus metas de crecimiento.',
};

export const METRIC_OPTIONS = [
  'Tráfico orgánico',
  'Posicionamiento / Ranking de keywords',
  'Link building publicado',
  'Alcance / Reach',
  'Engagement',
  'Leads / Conversión',
  'CTR / CPC / CPA',
  'Tráfico al sitio / Core Web Vitals',
  'Entregado a tiempo',
  'Aprobado sin retrabajo',
  'Ventas / Ingresos',
];

// Una tarea está "atrasada" en cuanto pasa su fecha de entrega sin estar en
// Hecho — sin margen de gracia (regla acordada para la revisión de viernes).
export function isOverdue(t, todayISO) {
  if (!t.end || t.status === 'Hecho') return false;
  return t.end < todayISO;
}

function p2(n) {
  return (n < 10 ? '0' : '') + n;
}
export function U(s) {
  const a = s.split('-').map(Number);
  return Date.UTC(a[0], a[1] - 1, a[2]);
}
export function dm(ms) {
  const d = new Date(ms);
  return d.getUTCDate() + ' ' + MON[d.getUTCMonth()];
}
export function fmt(s) {
  return dm(U(s));
}
export function fmtY(s) {
  const d = new Date(U(s));
  return d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
}
export function todayStr() {
  const n = new Date();
  return n.getFullYear() + '-' + p2(n.getMonth() + 1) + '-' + p2(n.getDate());
}
export function mondayMs(ms) {
  const d = new Date(ms);
  return ms - ((d.getUTCDay() + 6) % 7) * DAY;
}

export function colorOf(c) {
  return colorForClient(c.name) || c.color || '#6b6f8a';
}
export function onColor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#1A1B4B' : '#ffffff';
}

export function span(t, winStart, windowDays = N) {
  if (t.occ) {
    const ks = Object.keys(t.occ).sort();
    const i0 = (U(ks[0] || t.start) - winStart) / DAY;
    return { s: i0, e: i0, out: !ks.length };
  }
  if (!t.start) return null;
  const s = (U(t.start) - winStart) / DAY;
  const e = t.milestone ? s : t.end ? (U(t.end) - winStart) / DAY : windowDays - 1;
  return { s, e, out: e < 0 || s > windowDays - 1 };
}
export function datesText(t) {
  if (t.occ) return t.rule;
  if (!t.start) return 'sin fecha';
  if (t.milestone || t.end === t.start) return fmt(t.start);
  return t.end ? fmt(t.start) + ' → ' + fmt(t.end) : 'desde ' + fmt(t.start);
}

function nk(x) {
  return String(x).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
export function peopleOf(resp) {
  const out = [];
  const seen = {};
  String(resp || '').split(/[.;,]/).forEach((seg) => {
    seg = seg.split(':')[0].trim();
    seg.split(/\s+y\s+/).forEach((part) => {
      const w = part.trim().split(/\s+/)[0];
      if (!w || !/^[A-ZÁÉÍÓÚÑ]/.test(w)) return;
      let lab = w.toUpperCase() === w && w.length <= 4 ? w.charAt(0) + w.slice(1).toLowerCase() : w;
      let k = nk(lab);
      if (k === 'alitzel') { k = 'ali'; lab = 'Ali'; }
      if (k === 'lau') { k = 'laura'; lab = 'Laura'; }
      if (seen[k]) return;
      seen[k] = 1;
      out.push({ k, label: lab });
    });
  });
  return out;
}
export function isMine(resp) {
  return peopleOf(resp).some((p) => p.k === 'ali');
}

export function slug(n) {
  return String(n).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function isoOf(ms) {
  const d = new Date(ms);
  return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate());
}
export function isDate(x) {
  return /^\d{4}-\d{2}-\d{2}$/.test(x || '');
}

export function ruleText(freq, dates) {
  const f = String(freq || '').toLowerCase();
  if (f === 'diaria') return 'Diaria · lun–vie';
  if (f === 'semanal' || f === 'quincenal') {
    const seen = {};
    const names = [];
    dates.forEach((d) => {
      const n = DN[new Date(U(d)).getUTCDay()];
      if (!seen[n]) { seen[n] = 1; names.push(n); }
    });
    return (f === 'semanal' ? 'Semanal' : 'Cada 15 días') + ' · ' + names.join(' y ');
  }
  if (f === 'mensual (1er lunes)') return 'Mensual · 1er lunes';
  if (f === 'mensual' && dates[0]) return 'Mensual · día ' + Number(dates[0].slice(8));
  return String(freq || '');
}

const HIDE = { 'ZE-Scooters': 1, Traxión: 1, BICIEXPO: 1, 'Sistemas Internos': 1, Cuentas: 1, 'KJ Publicidad': 1, SOAINT: 1 };

export function panelItems(items) {
  return items.filter((i) => i.client && String(i.id).indexOf('g-') !== 0 && !i.isHistory);
}
export function allPanel(items) {
  return items.filter((i) => i.client && String(i.id).indexOf('g-') !== 0);
}

export function allClients(clients, items) {
  const out = clients.filter((c) => !HIDE[c.name]);
  const names = {};
  out.forEach((c) => { names[c.name] = 1; });
  const extra = {};
  panelItems(items).forEach((i) => { if (!names[i.client] && !HIDE[i.client]) extra[i.client] = 1; });
  Object.keys(extra).sort().forEach((n, k) => out.push({ id: 'p:' + slug(n), name: n, order: 900 + k, virtual: true }));
  return out;
}

export function panelTasks(c, items, winStart, nextOcc, windowDays = N) {
  const wS = isoOf(winStart);
  const wE = isoOf(winStart + (windowDays - 1) * DAY);
  const mine = allPanel(items).filter((i) => i.client === c.name);
  const groups = {};
  const order = [];
  mine.forEach((i) => {
    const lb = /link\s*building/i.test(i.activity || '');
    const k = lb ? 'id:' + i.id : 'act:' + (i.activity || '').trim().toLowerCase();
    if (!groups[k]) { groups[k] = []; order.push(k); }
    groups[k].push(i);
  });
  const out = [];
  order.forEach((k) => {
    const g = groups[k];
    const rec = g.filter((i) => i.freq && !i.isHistory && isDate(i.date));
    if (!rec.length) {
      g.forEach((i) => {
        if (i.isHistory) return;
        const d = isDate(i.date) ? i.date : '';
        out.push({
          id: 'p-' + i.id, panel: true, client: c.id, activity: i.activity, resp: i.resp, status: i.status || 'Pendiente', start: d, end: d,
          note: i.desc || '', doc: i.doc || '', category: i.category || '', deliverable: i.deliverable || '', dateKind: 'agreed',
          projectType: i.projectType || '', priority: i.p || '2', objectiveGeneral: i.objectiveGeneral || '', objectiveParticular: i.objectiveParticular || '', freq: i.freq || '', dependsOn: i.dependsOn || '', reviewDate: i.reviewDate || '', metric: i.metric || '',
        });
      });
      return;
    }
    const first = rec[0];
    const isDaily = String(first.freq || '').toLowerCase() === 'diaria';

    // Filas que ya existen para alguna fecha concreta de esta serie: la
    // plantilla misma (su propia fecha) y cualquier ocurrencia puntual ya
    // guardada (is_history, creada al editar un estatus/horas de una
    // semana/mes en particular). Si coinciden en la misma fecha, la
    // ocurrencia puntual gana sobre la plantilla.
    const byDate = {};
    g.forEach((i) => { if (!i.isHistory && isDate(i.date)) byDate[i.date] = i; });
    g.forEach((i) => { if (i.isHistory && isDate(i.date)) byDate[i.date] = i; });

    const dates = new Set(Object.keys(byDate).filter((d) => d >= wS && d <= wE));
    rec.forEach((i) => {
      let x = i.date;
      let n = 0;
      while (n++ < 800) {
        x = nextOcc(x, i.freq);
        if (!x || x > wE) break;
        if (isDaily) {
          const w = new Date(U(x)).getUTCDay();
          if (w === 0 || w === 6) continue;
        }
        if (x >= wS) dates.add(x);
      }
    });

    if (isDaily) {
      // Las diarias se quedan colapsadas en una sola fila (si no, serían
      // demasiadas filas); el histórico por fecha vive en el mismo lugar
      // de siempre (occ), sin fila propia por ocurrencia.
      const occ = {};
      [...dates].sort().forEach((d) => {
        const row = byDate[d];
        occ[d] = { status: row ? row.status || (row.isHistory ? 'Hecho' : 'Pendiente') : 'Pendiente' };
      });
      const lb2 = /link\s*building/i.test(first.activity || '');
      const rule = ruleText(first.freq, rec.map((i) => i.date));
      const ds = Object.keys(occ).sort();
      const base = rec.map((i) => i.date).sort()[0];
      out.push({
        id: 'p-' + first.id, panel: true, ro: true, client: c.id,
        activity: lb2 && first.desc ? first.activity + ' — ' + first.desc : first.activity,
        resp: first.resp, status: (ds[0] && occ[ds[0]]?.status) || 'Pendiente', start: ds[0] || base, end: ds[0] || base,
        occ, rule: '↻ ' + rule, note: lb2 ? '' : first.desc || '', doc: first.doc || '', category: first.category || '', deliverable: first.deliverable || '', dateKind: 'agreed',
        projectType: first.projectType || '', priority: first.p || '2', objectiveGeneral: first.objectiveGeneral || '', objectiveParticular: first.objectiveParticular || '', freq: first.freq || '', dependsOn: first.dependsOn || '', reviewDate: first.reviewDate || '', metric: first.metric || '', hours: first.hours || '',
      });
      return;
    }

    // Semanal/mensual: una fila POR CADA ocurrencia (pasada o futura, dentro
    // de la ventana visible), para que cada una quede como su propio
    // pendiente permanente en vez de una sola fila que se recicla. La que
    // todavía no tiene fila propia en la base de datos se marca
    // `needsMaterialize` — se crea hasta que alguien la edite (ver saveTask).
    [...dates].sort().forEach((d) => {
      const row = byDate[d];
      const lb2 = /link\s*building/i.test((row || first).activity || '');
      const src = row || first;
      out.push({
        id: row ? 'p-' + row.id : 'p-' + first.id + '__occ-' + d,
        needsMaterialize: !row,
        occDate: d,
        baseId: first.id,
        panel: true, client: c.id,
        activity: lb2 && src.desc ? src.activity + ' — ' + src.desc : (src.activity || first.activity),
        resp: src.resp || first.resp, status: row ? (row.status || (row.isHistory ? 'Hecho' : 'Pendiente')) : 'Pendiente',
        start: d, end: d,
        note: lb2 ? '' : src.desc || '', doc: src.doc || first.doc || '', category: src.category || first.category || '',
        deliverable: src.deliverable || first.deliverable || '', dateKind: 'agreed',
        projectType: src.projectType || first.projectType || '', priority: src.p || first.p || '2',
        objectiveGeneral: src.objectiveGeneral || first.objectiveGeneral || '', objectiveParticular: src.objectiveParticular || first.objectiveParticular || '',
        freq: first.freq || '', dependsOn: src.dependsOn || '', reviewDate: src.reviewDate || '', metric: src.metric || first.metric || '',
        hours: row && row.hours !== '' && row.hours != null ? row.hours : first.hours || '',
      });
    });
  });
  return out;
}

export function tasksOf(cid, clients, items, tasks, winStart, windowDays = N) {
  const c = allClients(clients, items).find((x) => x.id === cid);
  const own = tasks.filter((t) => t.client === cid);
  return c ? own.concat(panelTasks(c, items, winStart, nextOccurrence, windowDays)) : own;
}

// Rango real [minStart,maxEnd] (en ms) de una lista de tareas con fecha, para
// "ver proyecto completo". Ignora tareas sin fecha de inicio.
export function fullRangeOf(list) {
  let min = null;
  let max = null;
  list.forEach((t) => {
    if (!t.start) return;
    const s = U(t.start);
    const e = U(t.end || t.start);
    if (min === null || s < min) min = s;
    if (max === null || e > max) max = e;
  });
  return min === null ? null : { min, max };
}

export function byStart(a, b) {
  return (a.start || '').localeCompare(b.start || '') || (a.end || '9').localeCompare(b.end || '9');
}

// Ocurrencias de todas las tareas reales del Gantt (+ sintéticas del panel)
// de todos los clientes, agrupadas por día, para el Calendario unificado.
// Cada tarea con fecha se "ancla" en su fecha de entrega (o inicio si no
// tiene entrega); las recurrentes usan sus ocurrencias proyectadas (occ).
export function calendarOccurrences(clients, items, tasks, startISO, endISO) {
  const winStart = U(startISO);
  const windowDays = Math.round((U(endISO) - winStart) / DAY) + 1;
  const map = {};
  function add(dateISO, task, client) {
    if (!dateISO || dateISO < startISO || dateISO > endISO) return;
    (map[dateISO] = map[dateISO] || []).push({ ...task, clientName: client.name, clientColor: colorOf(client) });
  }
  allClients(clients, items).forEach((c) => {
    tasksOf(c.id, clients, items, tasks, winStart, windowDays).forEach((t) => {
      if (t.occ) {
        Object.keys(t.occ).forEach((d) => add(d, { ...t, status: t.occ[d].status }, c));
      } else {
        add(t.end || t.start, t, c);
      }
    });
  });
  return map;
}

// ---- Pestaña Tiempo: cuántas horas de cada persona se van en qué, para
// poder decidir si hay margen para proyectos nuevos. Por ahora solo se
// define la jornada de referencia de Ali; se agregan más personas después.
export const PEOPLE_CAPACITY = {
  ali: { label: 'Ali', hoursPerDay: 8, hoursPerWeek: 40 },
};

function taskMatchesPerson(t, personId) {
  if (Array.isArray(t.assigneeIds) && t.assigneeIds.length) return t.assigneeIds.includes(personId);
  return peopleOf(t.resp).some((p) => p.k === personId);
}

export function weekRange(dateISO = todayStr()) {
  const mon = mondayMs(U(dateISO));
  return { start: isoOf(mon), end: isoOf(mon + 6 * DAY) };
}

export function monthRange(dateISO = todayStr()) {
  const d = new Date(U(dateISO));
  const first = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  const last = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0);
  return { start: isoOf(first), end: isoOf(last) };
}

// Horas hábiles (lun–vie) de referencia dentro de un rango de fechas, para
// comparar "horas comprometidas" contra una jornada diaria.
export function businessHoursInRange(startISO, endISO, hoursPerDay) {
  let days = 0;
  let x = startISO;
  let n = 0;
  while (x <= endISO && n++ < 400) {
    const w = new Date(U(x)).getUTCDay();
    if (w !== 0 && w !== 6) days++;
    x = isoOf(U(x) + DAY);
  }
  return days * hoursPerDay;
}

// Resumen de horas comprometidas de una persona en [startISO,endISO]: fijo
// (recurrente) vs. proyectos (one-shot), y desglose por cliente — lo que
// necesita alguien que NO es la persona (ej. Alejandro) para decidir si
// hay margen para tomar más proyectos, solo viendo el panel.
export function computeTimeSummary(personId, startISO, endISO, clients, items, tasks) {
  const winStart = U(startISO);
  const windowDays = Math.round((U(endISO) - winStart) / DAY) + 1;
  const byClient = {};
  let fijo = 0;
  let proyecto = 0;

  allClients(clients, items).forEach((c) => {
    tasksOf(c.id, clients, items, tasks, winStart, windowDays).forEach((t) => {
      if (!taskMatchesPerson(t, personId)) return;
      const hrs = Number(t.hours || 0) || 0;
      if (!hrs) return;
      let hoursInPeriod = 0;
      if (t.occ) {
        Object.keys(t.occ).forEach((d) => { if (d >= startISO && d <= endISO) hoursInPeriod += hrs; });
      } else if (t.start && t.start >= startISO && t.start <= endISO) {
        hoursInPeriod = hrs;
      }
      if (!hoursInPeriod) return;
      if (t.freq) fijo += hoursInPeriod; else proyecto += hoursInPeriod;
      byClient[c.name] = (byClient[c.name] || 0) + hoursInPeriod;
    });
  });

  const total = fijo + proyecto;
  const clientBreakdown = Object.entries(byClient)
    .map(([name, hours]) => ({ name, hours, pct: total ? Math.round((hours / total) * 100) : 0 }))
    .sort((a, b) => b.hours - a.hours);

  return { fijo, proyecto, total, clientBreakdown };
}
