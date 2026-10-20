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
export const STATUSES = ['Pendiente', 'En proceso', 'Bloqueado', 'Hecho', 'Por confirmar', 'Pospuesto'];
export const SKEY = { Pendiente: 'p', 'En proceso': 'e', Bloqueado: 'b', Hecho: 'h', 'Por confirmar': 'c', Pospuesto: 'x', Cancelado: 'x' };
const DN = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

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

const HIDE = { 'ZE-Scooters': 1, Traxión: 1, BICIEXPO: 1, 'Sistemas Internos': 1, Cuentas: 1, 'KJ Publicidad': 1 };

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
        out.push({ id: 'p-' + i.id, panel: true, client: c.id, activity: i.activity, resp: i.resp, status: i.status || 'Pendiente', start: d, end: d, note: i.desc || '', dateKind: 'agreed' });
      });
      return;
    }
    const occ = {};
    g.forEach((i) => {
      if (!isDate(i.date)) return;
      if (i.date >= wS && i.date <= wE) occ[i.date] = { status: i.isHistory ? i.status || 'Hecho' : i.status || 'Pendiente' };
    });
    rec.forEach((i) => {
      let x = i.date;
      let n = 0;
      while (n++ < 800) {
        x = nextOcc(x, i.freq);
        if (!x || x > wE) break;
        if (String(i.freq).toLowerCase() === 'diaria') {
          const w = new Date(U(x)).getUTCDay();
          if (w === 0 || w === 6) continue;
        }
        if (x >= wS && !occ[x]) occ[x] = { status: 'Pendiente' };
      }
    });
    const first = rec[0];
    const lb2 = /link\s*building/i.test(first.activity || '');
    const rule = ruleText(first.freq, rec.map((i) => i.date));
    const ds = Object.keys(occ).sort();
    const base = rec.map((i) => i.date).sort()[0];
    out.push({
      id: 'p-' + first.id, panel: true, ro: true, client: c.id,
      activity: lb2 && first.desc ? first.activity + ' — ' + first.desc : first.activity,
      resp: first.resp, status: 'Pendiente', start: ds[0] || base, end: ds[0] || base,
      occ, rule: '↻ ' + rule, note: lb2 ? '' : first.desc || '', dateKind: 'agreed',
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
