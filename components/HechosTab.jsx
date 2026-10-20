'use client';
import GroupedTable from './GroupedTable';
import DailySummary from './DailySummary';

export default function HechosTab({ items, activeFilter, weekState, onUpdate, onRemove, onOpenDay, onCopyAll }) {
  let list = items.filter((i) => i.status === 'Hecho' || i.isHistory);
  if (activeFilter !== 'all') list = list.filter((i) => i.p === activeFilter);
  list = list.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <section className="panel active">
      <div className="section-head">
        <div>
          <h2>Hechos</h2>
          <p>Historial de pendientes completados — los recurrentes quedan aquí registrados cada vez que los marcas</p>
        </div>
        <button className="ghost" onClick={() => onCopyAll('hechos')}>📋 copiar todo para el Sheet</button>
      </div>
      <DailySummary items={items} weekMonday={weekState.monday} onShiftWeek={weekState.shift} onGoToday={weekState.goToday} onOpenDay={onOpenDay} />
      <div className="client-block">
        <div style={{ overflowX: 'auto' }}>
          <GroupedTable list={list} onUpdate={onUpdate} onRemove={onRemove} emptyMessage="Todavía no hay pendientes marcados como Hecho." />
        </div>
      </div>
    </section>
  );
}
