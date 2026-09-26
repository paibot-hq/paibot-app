-- Migration number: 0001 	 2026-09-26T00:50:14.850Z

-- One shared DB for the whole app (see wrangler.jsonc's d1_databases comment).
-- Composite primary key: the only access patterns are "does (user_id, app_slug)
-- exist" and "list app_slug for a user_id", both served by this key directly -
-- no surrogate id needed.
CREATE TABLE favorites (
  user_id    TEXT NOT NULL,
  app_slug   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, app_slug)
);
