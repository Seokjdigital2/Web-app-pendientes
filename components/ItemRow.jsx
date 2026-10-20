'use client';
import { fmtH, weekLabelForDate, STATUS_OPTIONS, FREQ_OPTIONS } from '@/lib/logic';

export default function ItemRow({ item, onUpdate, onRemove, extraActions }) {
  const it = item;
  return (
    <tr>
      <td>{it.resp || 'ALI'}</td>
      <td>{it.client}</td>
      <td>
        <select
          className={`pill-select pill-${it.p}`}
          value={it.p}
          onChange={(e) => onUpdate(it.id, 'p', e.target.value)}
        >
          <option value="R">R</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="V">V</option>
          <option value="O">O</option>
          <option value="I">I</option>
        </select>
      </td>
      <td>{it.activity}</td>
      <td>{it.desc}</td>
      <td>
        <input
          type="text"
          defaultValue={it.doc}
          placeholder="link…"
          onBlur={(e) => {
            if (e.target.value !== it.doc) onUpdate(it.id, 'doc', e.target.value);
          }}
        />
      </td>
      <td>
        <input
          type="date"
          defaultValue={it.date}
          onChange={(e) => onUpdate(it.id, 'date', e.target.value)}
        />
      </td>
      <td>
        <select value={it.freq || ''} onChange={(e) => onUpdate(it.id, 'freq', e.target.value)}>
          {FREQ_OPTIONS.map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
      </td>
      <td className="week-cell">{weekLabelForDate(it.date)}</td>
      <td className="hours-cell">
        <input
          type="number"
          step="0.5"
          min="0"
          defaultValue={it.hours}
          onBlur={(e) => {
            if (e.target.value !== String(it.hours)) onUpdate(it.id, 'hours', e.target.value);
          }}
        />
        <div className="hm">{fmtH(it.hours)}</div>
      </td>
      <td>
        <select value={it.status || ''} onChange={(e) => onUpdate(it.id, 'status', e.target.value)}>
          <option value="">—</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </td>
      <td>
        {extraActions}
        <button className="del-btn" onClick={() => onRemove(it.id)}>
          quitar
        </button>
      </td>
    </tr>
  );
}
