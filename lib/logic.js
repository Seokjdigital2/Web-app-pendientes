// Lógica pura portada del panel original (fechas, recurrencias, colores).

export const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function isoDateLocal(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function mondayOf(d) {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() + ((day === 0 ? -6 : 1) - day));
  date.setHours(0, 0, 0, 0);
  return date;
}

// horas decimales -> '45m' / '7h 55m'
export function fmtH(n) {
  const m = Math.round((parseFloat(n) || 0) * 60);
  if (m <= 0) return '';
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h === 0) return mm + 'm';
  return mm === 0 ? h + 'h' : h + 'h ' + mm + 'm';
}

export function fmtWeekLabel(m) {
  const end = new Date(m);
  end.setDate(end.getDate() + 6);
  const o = { day: 'numeric', month: 'short' };
  return `Semana del ${m.toLocaleDateString('es-MX', o)} al ${end.toLocaleDateString('es-MX', o)}`;
}

export function weekLabelForDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  const mon = mondayOf(d);
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const o = { day: 'numeric', month: 'short' };
  return `${mon.toLocaleDateString('es-MX', o)} – ${sun.toLocaleDateString('es-MX', o)}`;
}

export function nextOccurrence(dateStr, freq) {
  if (!dateStr || !freq) return dateStr;
  const d = new Date(dateStr + 'T00:00:00');
  if (freq === 'Diaria') d.setDate(d.getDate() + 1);
  else if (freq === 'Semanal') d.setDate(d.getDate() + 7);
  else if (freq === 'Quincenal') d.setDate(d.getDate() + 15);
  else if (freq === 'Mensual') d.setMonth(d.getMonth() + 1);
  else if (freq === 'Mensual (1er lunes)') {
    const n = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    while (n.getDay() !== 1) n.setDate(n.getDate() + 1);
    return isoDateLocal(n);
  } else return dateStr;
  return isoDateLocal(d);
}

// ocurrencias reales + proyectadas de recurrentes, para un rango [startISO,endISO]
export function occurrencesForRange(items, startISO, endISO) {
  const map = {};
  function add(dateISO, item) {
    if (!dateISO || dateISO < startISO || dateISO > endISO) return;
    (map[dateISO] = map[dateISO] || []).push(item);
  }
  items.forEach((it) => {
    if (!it.date) return;
    add(it.date, it);
    if (it.p === 'R' && it.freq && !it.isHistory) {
      let d = it.date;
      let guard = 0;
      while (guard++ < 1500) {
        d = nextOccurrence(d, it.freq);
        if (!d || d > endISO) break;
        add(d, it);
      }
    }
  });
  return map;
}

export function occurrencesForItemRange(it, startISO, endISO) {
  const out = [];
  if (!it.date) return out;
  if (it.date >= startISO && it.date <= endISO) out.push(it.date);
  if (it.p === 'R' && it.freq && !it.isHistory) {
    let d = it.date;
    let guard = 0;
    while (guard++ < 1500) {
      d = nextOccurrence(d, it.freq);
      if (!d || d > endISO) break;
      if (d >= startISO) out.push(d);
    }
  }
  return out;
}

export const CLIENT_PALETTE = ['#FF6B6B', '#4ECDC4', '#FFD166', '#8657E6', '#06AED5', '#FF9F1C', '#2EC4B6', '#EF476F', '#3A86FF', '#FFB4A2', '#06D6A0', '#F15BB5'];
export const CLIENT_COLOR_MAP = {
  'CRUCE TEQUES': '#1D4ED8',
  ECOCE: '#16A34A',
  'KJ SEO': '#E11D48',
  'LAU LEÓN': '#7C3AED',
  SOAINT: '#0B1440',
  Lurozo: '#F97316',
  'ZE-Scooters': '#111111',
  Novatrading: '#7EC8E3',
  PHI: '#2DD4BF',
  Cuentas: '#EC4899',
  Traxión: '#FACC15',
  Tania: '#FF69B4',
  'KOKO IA': '#A16207',
  BICIEXPO: '#0EA5E9',
  'KJ Publicidad': '#5C4A8A',
};

export function colorForClient(name) {
  if (CLIENT_COLOR_MAP[name]) return CLIENT_COLOR_MAP[name];
  let hash = 0;
  const str = name || '';
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return CLIENT_PALETTE[Math.abs(hash) % CLIENT_PALETTE.length];
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function groupByClient(list) {
  const byClient = {};
  list.forEach((it) => {
    const key = it.client || '(sin cliente / general)';
    (byClient[key] = byClient[key] || []).push(it);
  });
  return byClient;
}

export const FILTER_OPTIONS = [
  ['all', 'Todos'],
  ['R', 'Recurrentes'],
  ['1', 'P1'],
  ['2', 'P2'],
  ['3', 'P3'],
  ['V', 'Revisar'],
  ['O', 'Objetivos'],
  ['I', 'Ideas'],
];

export const STATUS_OPTIONS = ['Pendiente', 'En proceso', 'Bloqueado', 'Pospuesto', 'Hecho', 'Por confirmar'];
export const FREQ_OPTIONS = [
  ['', '—'],
  ['Diaria', 'Diaria'],
  ['Semanal', 'Semanal'],
  ['Quincenal', 'Quincenal'],
  ['Mensual', 'Mensual'],
  ['Mensual (1er lunes)', 'Mensual · 1er lunes'],
];
