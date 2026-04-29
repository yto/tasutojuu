CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT,
  nickname TEXT,
  score INTEGER,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS best_scores (
  player_id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  best_score INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS restore_codes (
  player_id  TEXT PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
