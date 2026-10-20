'use client';
import React from 'react';
import { groupByClient, colorForClient } from '@/lib/logic';
import ItemRow from './ItemRow';

export default function GroupedTable({ list, onUpdate, onRemove, rowExtra, emptyMessage }) {
  if (!list.length) {
    return (
      <table>
        <tbody>
          <tr>
            <td colSpan={12} className="empty">
              {emptyMessage}
            </td>
          </tr>
        </tbody>
      </table>
    );
  }
  const byClient = groupByClient(list);
  const clientNames = Object.keys(byClient).sort();
  return (
    <table>
      <thead>
        <tr>
          <th>Resp.</th>
          <th>Cliente</th>
          <th>P</th>
          <th>Actividad</th>
          <th>Descripción</th>
          <th>Documento</th>
          <th>Fecha</th>
          <th>Frecuencia</th>
          <th>Semana</th>
          <th>Horas</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {clientNames.map((client) => {
          const rows = byClient[client].slice().sort((a, b) => {
            if (a.p !== b.p) return a.p.localeCompare(b.p);
            if (a.activity !== b.activity) return (a.activity || '').localeCompare(b.activity || '');
            return (a.order || 0) - (b.order || 0);
          });
          return (
            <React.Fragment key={'grp-' + client}>
              <tr className="client-group-row">
                <td colSpan={12} style={{ borderLeft: `4px solid ${colorForClient(client)}` }}>
                  <span className="client-dot" style={{ background: colorForClient(client) }}></span>
                  {client}
                </td>
              </tr>
              {rows.map((it) => (
                <ItemRow
                  key={it.id}
                  item={it}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                  extraActions={rowExtra ? rowExtra(it) : null}
                />
              ))}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
