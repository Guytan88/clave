// GET ?id&s : admin approves a guide (link from the review email) → publish + email the host.
import { loadGuide, saveGuide, checkSig, siteUrl, links, html, esc } from "./_lib/core.js";
import { mailReady } from "./_lib/mail.js";

export default async function handler(req, res) {
  try { return await run(req, res); }
  catch (e) { console.error(e); return res.status(500).json({ error: "server" }); }
}

async function run(req, res) {
  const id = String(req.query.id || "");
  const g = await loadGuide(id);
  if (!g || !checkSig("approve:" + id, req.query.s)) return html(res, 404, "לא נמצא", "<h2>הקישור לא תקין</h2>");
  if (!g.content || !g.slug) return html(res, 409, "עוד לא מוכן", "<h2>המדריך עוד לא נוצר</h2><p>חכה למייל הבדיקה ונסה שוב.</p>");
  const l = links(siteUrl(req), g);
  if (!g.approved) {
    g.approved = true; g.status = "published"; g.approvedAt = new Date().toISOString();
    await saveGuide(g);
    if (g.email) await mailReady(g.lang, g.email, { guide: l.guide, edit: l.edit });
  }
  html(res, 200, "אושר", `<h2 style="margin-top:0">✓ המדריך אושר ונשלח ללקוח</h2>
<p><b>${esc(g.content.name)}</b><br>${esc(g.email)}</p>
<p><a href="${l.guide}" style="color:#2E5E4E;font-weight:bold">${esc(l.guide)}</a></p>`);
}
