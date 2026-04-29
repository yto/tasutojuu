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
