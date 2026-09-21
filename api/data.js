// Serverless sync endpoint — deploy on Vercel (or Netlify Functions).
// Env: DATABASE_URL (Postgres, e.g. Neon/Supabase/Vercel Postgres), SYNC_TOKEN (shared secret).
import { neon } from "@neondatabase/serverless";

const USER = "me"; // single-user tracker

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOW_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type,x-gym-token");
  res.setHeader("Access-Control-Max-Age", "86400");
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (!process.env.DATABASE_URL) return res.status(500).json({ error: "DATABASE_URL not set" });
  const token = process.env.SYNC_TOKEN;
  if (token && req.headers["x-gym-token"] !== token) return res.status(401).json({ error: "bad token" });

  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS gym_log (
    id       text PRIMARY KEY,
    payload  jsonb NOT NULL,
    updated  bigint NOT NULL DEFAULT 0
  )`;

  try {
    if (req.method === "GET") {
      const rows = await sql`SELECT payload, updated FROM gym_log WHERE id = ${USER}`;
      if (!rows.length) return res.status(200).json({ days: {}, updated: 0 });
      return res.status(200).json({ ...rows[0].payload, updated: Number(rows[0].updated) });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (!body || typeof body !== "object" || typeof body.days !== "object")
        return res.status(400).json({ error: "expected { days, updated }" });

      const updated = Number(body.updated) || Date.now();
      await sql`INSERT INTO gym_log (id, payload, updated)
                VALUES (${USER}, ${JSON.stringify(body)}::jsonb, ${updated})
                ON CONFLICT (id) DO UPDATE
                  SET payload = EXCLUDED.payload, updated = EXCLUDED.updated
                  WHERE gym_log.updated <= EXCLUDED.updated`;
      return res.status(200).json({ ok: true, updated });
    }

    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
