// GET ?id&k : private view of a guide record for the edit page.
import { loadGuide, tokenOk, siteUrl, links } from "./_lib/core.js";

export default async function handler(req, res) {
  const { id, k } = req.query;
  const g = await loadGuide(String(id || ""));
  if (!tokenOk(g, k)) return res.status(404).json({ error: "not_found" });
  const l = links(siteUrl(req), g);
  res.json({
    status: g.status, approved: g.approved, lang: g.lang, email: g.email, payer: g.payer,
    input: g.input || null, guideUrl: g.approved ? l.guide : null, edits: g.edits || 0, error: g.status === "error",
  });
}
