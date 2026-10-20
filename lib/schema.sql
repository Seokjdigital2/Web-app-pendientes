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
