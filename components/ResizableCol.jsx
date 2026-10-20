'use client';
import { useRef } from 'react';

// Columna de ancho ajustable: arrastra el borde derecho para cambiar `width`.
// El ancho vive en el estado del padre (compartido entre encabezado y filas)
// para que toda la tabla quede alineada.
export default function ResizableCol({ width, minWidth = 60, onResize, className = '', style, children, sticky = false }) {
  const dragRef = useRef(null);

  function onMouseDown(e) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    function onMove(ev) {
      const w = Math.max(minWidth, startWidth + (ev.clientX - startX));
      onResize(w);
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  return (
    <div
      className={`gt-col ${className}${sticky ? ' gt-col-sticky' : ''}`}
      style={{ width, minWidth: width, maxWidth: width, ...style }}
    >
      <div className="gt-col-inner">{children}</div>
      <div className="gt-col-resizer" onMouseDown={onMouseDown} ref={dragRef} />
    </div>
  );
}
