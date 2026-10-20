CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  resp TEXT DEFAULT '',
  client TEXT DEFAULT '',
  p TEXT DEFAULT '2',
  "order" INTEGER DEFAULT 1,
  activity TEXT DEFAULT '',
  description TEXT DEFAULT '',
  doc TEXT DEFAULT '',
  date TEXT DEFAULT '',
  freq TEXT DEFAULT '',
  hours TEXT DEFAULT '',
  status TEXT DEFAULT '',
  is_history BOOLEAN DEFAULT FALSE,
  seq INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '',
  "order" INTEGER DEFAULT 0,
  meetings JSONB DEFAULT '[]',
  last_meeting JSONB,
  updated_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  client TEXT DEFAULT '',
  activity TEXT DEFAULT '',
  category TEXT DEFAULT '',
  date_kind TEXT DEFAULT '',
  doc TEXT DEFAULT '',
  start TEXT DEFAULT '',
  "end" TEXT DEFAULT '',
  note TEXT DEFAULT '',
  resp TEXT DEFAULT '',
  source TEXT DEFAULT '',
  status TEXT DEFAULT '',
  milestone BOOLEAN DEFAULT FALSE,
  meeting_url TEXT DEFAULT '',
  meeting_date TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Columnas agregadas por el rediseño del Gantt (catálogo de responsables,
-- avance manual, bloqueo con motivo, entregable/meta). ALTER idempotente
-- para que correr migrate.mjs de nuevo contra una base ya existente no falle.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_ids JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS progress INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocked_reason TEXT DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deliverable TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  "order" INTEGER DEFAULT 0
);

-- Historial de cambios manuales (fecha, estatus, avance, bloqueo, responsables)
-- por tarea de Gantt. old_value/new_value se guardan como texto (JSON cuando
-- el valor no es un string simple) para no tener que tipar una columna por campo.
CREATE TABLE IF NOT EXISTS task_history (
  id BIGSERIAL PRIMARY KEY,
  task_id TEXT NOT NULL,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  note TEXT DEFAULT '',
  changed_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS task_history_task_id_idx ON task_history (task_id);
