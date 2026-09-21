-- The API creates this automatically on first request; here for reference.
CREATE TABLE IF NOT EXISTS gym_log (
  id      text   PRIMARY KEY,
  payload jsonb  NOT NULL,
  updated bigint NOT NULL DEFAULT 0
);
