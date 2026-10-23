'use client';

export default function DayModal({ open, dateISO, list, onClose }) {
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
        {!list.length ? (
          <p className="empty">No hay pendientes en este día.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {list.map((t, i) => (
              <div key={(t.id || i) + '-' + i} style={{ border: '1px solid var(--line)', borderRadius: 6, padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <b style={{ fontSize: 13.5 }}>{t.activity}</b>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--grey-text)' }}>{t.progress == null ? '—' : `${t.progress}%`}</span>
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--grey-text)', marginTop: 4 }}>
                  {t.clientName} · {t.category || 'sin categoría'} · {t.status || 'Pendiente'}
                </div>
                {t.note && <div style={{ fontSize: 12, color: 'var(--ink)', marginTop: 6 }}>{t.note}</div>}
              </div>
            ))}
            <p className="mono" style={{ fontSize: 10.5, color: 'var(--grey-text)', textAlign: 'center', marginTop: 4 }}>
              Edítalo desde la pestaña Gantt, en el cliente correspondiente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
