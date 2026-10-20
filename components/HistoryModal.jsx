'use client';

const FIELD_LABELS = {
  status: 'Estatus',
  progress: 'Avance',
  assigneeIds: 'Responsables',
  start: 'Fecha de inicio',
  end: 'Fecha de entrega',
  blocked_reason: 'Motivo de bloqueo',
};

function fmtValue(field, v) {
  if (v === null || v === undefined || v === '') return '—';
  if (field === 'progress') return `${v}%`;
  if (field === 'assigneeIds') {
    try {
      return JSON.parse(v).join(', ') || '—';
    } catch {
      return v;
    }
  }
  return v;
}

export default function HistoryModal({ open, entries, onClose }) {
  if (!open) return null;
  return (
    <div className="day-modal-overlay show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="day-modal" style={{ maxWidth: 560 }}>
        <div className="day-modal-header">
          <span>Historial de cambios</span>
          <button onClick={onClose}>✕</button>
        </div>
        {!entries.length ? (
          <p className="empty">Todavía no hay cambios registrados para esta tarea.</p>
        ) : (
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {entries.map((e) => (
              <div key={e.id} style={{ borderBottom: '1px solid var(--line)', padding: '8px 0', fontSize: 13 }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10.5, color: 'var(--grey-text)' }}>
                  {new Date(e.changedAt).toLocaleString('es-MX')} {e.note ? `· ${e.note}` : ''}
                </div>
                <div>
                  <b>{FIELD_LABELS[e.field] || e.field}</b>: {fmtValue(e.field, e.oldValue)} → {fmtValue(e.field, e.newValue)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
