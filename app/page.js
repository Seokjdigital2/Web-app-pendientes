'use client';
import { useEffect, useRef, useState } from 'react';
import { isoDateLocal, mondayOf, nextOccurrence, uid } from '@/lib/logic';
import HoyTab from '@/components/HoyTab';
import PendientesTab from '@/components/PendientesTab';
import HechosTab from '@/components/HechosTab';
import CalendarTab from '@/components/CalendarTab';
import GanttTab from '@/components/GanttTab';
import DayModal from '@/components/DayModal';

const TABS = [
  ['hoy', 'Hoy'],
  ['pendientes', 'Pendientes'],
  ['hechos', 'Hechos'],
  ['calendario', 'Calendario'],
  ['gantt', 'Gantt'],
];

export default function Home() {
  const [tab, setTab] = useState('hoy');
  const [items, setItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [summaryWeekMonday, setSummaryWeekMonday] = useState(() => mondayOf(new Date()));
  const [dayModal, setDayModal] = useState({ open: false, dateISO: null, list: [] });
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef(null);
  const [dbConnected, setDbConnected] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [itemsRes, clientsRes, tasksRes] = await Promise.all([
          fetch('/api/items').then((r) => r.json()),
          fetch('/api/clients').then((r) => r.json()),
          fetch('/api/tasks').then((r) => r.json()),
        ]);
        if (itemsRes.error) setDbConnected(false);
        setItems(itemsRes.items || []);
        setClients(clientsRes.clients || []);
        setTasks(tasksRes.tasks || []);
      } catch (e) {
        setDbConnected(false);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function toast(msg) {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 1600);
  }

  function refreshDayModal(nextItems) {
    setDayModal((m) => {
      if (!m.open || !m.dateISO) return m;
      return { ...m, list: nextItems.filter((i) => i.date === m.dateISO) };
    });
  }

  async function updateItemField(id, field, value) {
    let historyCopy = null;
    setItems((prev) => {
      const next = prev.map((i) => ({ ...i }));
      const it = next.find((i) => i.id === id);
      if (!it) return prev;
      it[field] = value;
      if (field === 'status' && value === 'Hecho' && it.freq && it.date) {
        historyCopy = { ...it, id: uid(), isHistory: true, status: 'Hecho' };
        next.push(historyCopy);
        it.date = nextOccurrence(it.date, it.freq);
        it.status = '';
        toast(`Ciclo cumplido — se guardó en Hechos, próxima fecha: ${it.date}`);
      }
      refreshDayModal(next);
      return next;
    });
    try {
      await fetch(`/api/items/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) });
      if (historyCopy) {
        await fetch('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(historyCopy) });
      }
    } catch (e) {
      toast('No se pudo guardar el cambio');
    }
  }

  async function removeItem(id) {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      refreshDayModal(next);
      return next;
    });
    try {
      await fetch(`/api/items/${id}`, { method: 'DELETE' });
    } catch (e) {
      toast('No se pudo eliminar');
    }
  }

  async function addItem(data) {
    const sameGroup = items.filter((i) => i.client === data.client && i.activity === data.activity && i.p === data.p);
    const order = sameGroup.length ? Math.max(...sameGroup.map((i) => i.order || 0)) + 1 : 1;
    const newItem = { id: uid(), order, isHistory: false, ...data };
    setItems((prev) => [...prev, newItem]);
    try {
      await fetch('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newItem) });
      toast('Agregado');
    } catch (e) {
      toast('No se pudo guardar');
    }
  }

  async function addItemForToday(data) {
    const todayISO = isoDateLocal(new Date());
    await addItem({ ...data, doc: '', date: todayISO, freq: '', status: 'Pendiente' });
    toast('Agregado a hoy');
  }

  async function moveToTomorrow(id) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    await updateItemField(id, 'date', isoDateLocal(d));
    toast('Movido a mañana');
  }

  async function updateTaskStatus(id, value) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: value } : t)));
    try {
      await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: value }) });
    } catch (e) {
      toast('No se pudo guardar el estatus del Gantt');
    }
  }

  function openDayModal(dateISO, precomputedList) {
    const list = precomputedList || items.filter((i) => i.date === dateISO);
    setDayModal({ open: true, dateISO, list });
  }
  function closeDayModal() {
    setDayModal({ open: false, dateISO: null, list: [] });
  }

  function copyAllItems(which) {
    let list = items.slice().filter((i) => (which === 'hechos' ? i.status === 'Hecho' || i.isHistory : i.status !== 'Hecho' && !i.isHistory));
    if (activeFilter !== 'all') list = list.filter((i) => i.p === activeFilter);
    if (!list.length) return toast('Nada que copiar en este filtro');
    list.sort((a, b) => (a.client || '').localeCompare(b.client) || a.p.localeCompare(b.p) || (a.order || 0) - (b.order || 0));
    const rows = list.map((it) => [it.resp || 'ALI', it.client || '', it.p, it.activity, it.desc || '', it.doc || '', it.date || '', it.freq || '', it.hours || '', it.status || ''].join('\t'));
    navigator.clipboard.writeText(rows.join('\n')).then(
      () => toast('Copiado — pégalo directo en tu Sheet'),
      () => toast('No se pudo copiar automático, selecciona el texto manualmente')
    );
  }

  const weekState = {
    monday: summaryWeekMonday,
    shift: (delta) => setSummaryWeekMonday((m) => { const d = new Date(m); d.setDate(d.getDate() + delta * 7); return d; }),
    goToday: () => setSummaryWeekMonday(mondayOf(new Date())),
  };

  const todayLabel = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <header>
        <div>
          <div className="eyebrow">KJ Publicidad · Operación</div>
          <h1>Panel de Pendientes</h1>
        </div>
        <div className="today mono">{todayLabel}</div>
      </header>
      <nav>
        {TABS.map(([key, label]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>
        ))}
      </nav>
      {!dbConnected && (
        <div className="banner-warn">
          Sin conexión a la base de datos (Neon). Estás viendo datos de ejemplo de solo lectura — configura DATABASE_URL para guardar cambios.
        </div>
      )}
      <main>
        {loading ? (
          <p className="empty">Cargando…</p>
        ) : (
          <>
            {tab === 'hoy' && (
              <HoyTab
                items={items}
                weekState={weekState}
                onUpdate={updateItemField}
                onRemove={removeItem}
                onMoveToTomorrow={moveToTomorrow}
                onAddForToday={addItemForToday}
                onOpenDay={openDayModal}
              />
            )}
            {tab === 'pendientes' && (
              <PendientesTab
                items={items}
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                weekState={weekState}
                onUpdate={updateItemField}
                onRemove={removeItem}
                onAdd={addItem}
                onOpenDay={openDayModal}
                onCopyAll={copyAllItems}
              />
            )}
            {tab === 'hechos' && (
              <HechosTab
                items={items}
                activeFilter={activeFilter}
                weekState={weekState}
                onUpdate={updateItemField}
                onRemove={removeItem}
                onOpenDay={openDayModal}
                onCopyAll={copyAllItems}
              />
            )}
            {tab === 'calendario' && <CalendarTab items={items} onOpenDay={openDayModal} />}
            {tab === 'gantt' && (
              <GanttTab
                items={items}
                clients={clients}
                tasks={tasks}
                onUpdateItemField={updateItemField}
                onUpdateTaskStatus={updateTaskStatus}
              />
            )}
          </>
        )}
      </main>
      <DayModal
        open={dayModal.open}
        dateISO={dayModal.dateISO}
        list={dayModal.list}
        onClose={closeDayModal}
        onUpdate={updateItemField}
        onRemove={removeItem}
      />
      <footer>KJ Publicidad — pendientes del panel y Gantt de clientes</footer>
      <div className={`toast${toastMsg ? ' show' : ''}`}>{toastMsg}</div>
    </>
  );
}
