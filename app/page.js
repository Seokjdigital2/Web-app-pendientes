'use client';
import { useEffect, useRef, useState } from 'react';
import CalendarTab from '@/components/CalendarTab';
import GanttTab from '@/components/GanttTab';
import TimeTab from '@/components/TimeTab';
import DayModal from '@/components/DayModal';

const TABS = [
  ['gantt', 'Gantt'],
  ['calendario', 'Calendario'],
  ['tiempo', 'Tiempo'],
];

export default function Home() {
  const [tab, setTab] = useState('gantt');
  const [items, setItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
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
    setItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, [field]: value } : i));
      refreshDayModal(next);
      return next;
    });
    try {
      await fetch(`/api/items/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) });
    } catch (e) {
      toast('No se pudo guardar el cambio');
    }
  }

  // Marca el estatus de UNA ocurrencia puntual de una tarea recurrente del
  // panel (ej. el "Weekly" de esta semana), creando/actualizando su propia
  // fila histórica en vez de tocar la fila plantilla de la recurrencia.
  async function saveOccurrence(data) {
    try {
      const res = await fetch('/api/items/occurrence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'No se pudo guardar la ocurrencia');
      setItems((prev) => {
        const next = prev.some((i) => i.id === resData.item.id)
          ? prev.map((i) => (i.id === resData.item.id ? resData.item : i))
          : [...prev, resData.item];
        refreshDayModal(next);
        return next;
      });
    } catch (e) {
      toast(e.message || 'No se pudo guardar el cambio');
    }
  }

  async function createTask(data) {
    const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const resData = await res.json();
    if (!res.ok) {
      const err = new Error(resData.error || 'No se pudo crear el pendiente');
      throw err;
    }
    setTasks((prev) => [...prev, resData.task]);
    toast('Pendiente agregado');
    return resData.task;
  }

  async function createClient(id, name) {
    const res = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, name }) });
    const data = await res.json();
    if (res.ok && data.client) {
      setClients((prev) => (prev.some((c) => c.id === data.client.id) ? prev : [...prev, data.client]));
      return data.client;
    }
    return null;
  }

  async function updateClient(id, patch) {
    const prevClients = clients;
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const res = await fetch(`/api/clients/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    const data = await res.json();
    if (!res.ok) {
      setClients(prevClients);
      toast('No se pudo guardar el cambio del cliente');
      return null;
    }
    if (data.client) setClients((prev) => prev.map((c) => (c.id === id ? data.client : c)));
    return data.client;
  }

  async function updateTask(id, patch) {
    const prevTasks = tasks;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const res = await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    const data = await res.json();
    if (!res.ok) {
      setTasks(prevTasks);
      const err = new Error(data.error || 'No se pudo guardar el cambio');
      err.code = data.code;
      throw err;
    }
    if (data.task) setTasks((prev) => prev.map((t) => (t.id === id ? data.task : t)));
    return data.task;
  }

  async function deleteTask(id) {
    const prevTasks = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      toast('Pendiente eliminado');
    } catch (e) {
      setTasks(prevTasks);
      toast('No se pudo eliminar');
    }
  }

  function openDayModal(dateISO, precomputedList) {
    const list = precomputedList || items.filter((i) => i.date === dateISO);
    setDayModal({ open: true, dateISO, list });
  }
  function closeDayModal() {
    setDayModal({ open: false, dateISO: null, list: [] });
  }

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
            {tab === 'gantt' && (
              <GanttTab
                items={items}
                clients={clients}
                tasks={tasks}
                onUpdateItemField={updateItemField}
                onSaveOccurrence={saveOccurrence}
                onCreateTask={createTask}
                onCreateClient={createClient}
                onUpdateClient={updateClient}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
              />
            )}
            {tab === 'calendario' && <CalendarTab items={items} clients={clients} tasks={tasks} onOpenDay={openDayModal} />}
            {tab === 'tiempo' && <TimeTab items={items} clients={clients} tasks={tasks} />}
          </>
        )}
      </main>
      <DayModal
        open={dayModal.open}
        dateISO={dayModal.dateISO}
        list={dayModal.list}
        onClose={closeDayModal}
      />
      <footer>KJ Publicidad — pendientes del panel y Gantt de clientes</footer>
      <div className={`toast${toastMsg ? ' show' : ''}`}>{toastMsg}</div>
    </>
  );
}
