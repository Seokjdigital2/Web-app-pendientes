'use client';
import GroupedTable from './GroupedTable';

export default function DayModal({ open, dateISO, list, onClose, onUpdate, onRemove }) {
  if (!open) return null;
  const title = dateISO
    ? new Date(dateISO + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';
  return (
    <div className="day-modal-overlay show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="day-modal">
        <div className="day-modal-header">
          <span style={{ textTransform: 'capitalize' }}>{title}</span>
          <button onClick={onClose}>✕</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <GroupedTable
            list={list}
            onUpdate={onUpdate}
            onRemove={onRemove}
            emptyMessage="No hay pendientes en este día."
          />
        </div>
      </div>
    </div>
  );
}
