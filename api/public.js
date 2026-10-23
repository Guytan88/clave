// GET ?slug[&p=previewSig] : published guide content for the guide page.
import { db, loadGuide, checkSig } from "./_lib/core.js";

export default async function handler(req, res) {
  try { return await run(req, res); }
  catch (e) { console.error(e); return res.status(500).json({ error: "server" }); }
}

async function run(req, res) {
  const slug = String(req.query.slug || "");
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) return res.status(404).json({ error: "not_found" });
  const id = await db.get(`s:${slug}`);
  const g = id && (await loadGuide(id));
  const preview = g && checkSig("preview:" + g.id, req.query.p);
  if (!g || !g.content || (!g.approved && !preview)) return res.status(404).json({ error: "not_found" });
  res.setHeader("Cache-Control", preview ? "no-store" : "public, max-age=0, s-maxage=30, stale-while-revalidate=300");
  res.json({ ...g.content, preview: !g.approved });
}
