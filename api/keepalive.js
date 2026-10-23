// Daily cron (vercel.json): touches the database so the free Supabase project never pauses for inactivity.
import { db } from "./_lib/core.js";

export default async function handler(req, res) {
  try {
    await db.setJSON("keepalive", { at: new Date().toISOString() });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
}
