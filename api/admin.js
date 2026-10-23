// Admin page API (link from the admin email, signed with ADMIN_SECRET).
// GET ?id&s → answers + prompt for Claude.  POST {id, s, json} → save content (publish at once if already approved).
import { body, loadGuide, saveGuide, checkSig, siteUrl, links } from "./_lib/core.js";
import { manualPrompt, parseManual } from "./_lib/ai.js";
import { ensureSlug, assemble } from "./_lib/guide.js";

export default async function handler(req, res) {
  try {
    const src = req.method === "POST" ? body(req) : req.query;
    const id = String(src.id || "");
    const g = await loadGuide(id);
    if (!g || !checkSig("admin:" + id, src.s)) return res.status(404).json({ error: "not_found" });
    const base = siteUrl(req);

    if (req.method === "POST") {
      if (!g.input) return res.status(409).json({ error: "הלקוח עוד לא מילא את הטופס" });
      let L;
      try { L = parseManual(src.json, g.input.languages); }
      catch (e) { return res.status(400).json({ error: e.message }); }
      await ensureSlug(g);
      g.content = assemble(g.input, L);
      if (g.approved) { g.status = "published"; g.pendingUpdate = false; }
      else g.status = "review";
      delete g.error;
      await saveGuide(g);
    }

    const l = links(base, g);
    res.json({
      name: g.input?.name || "", email: g.email, order: g.order, amount: g.amount, status: g.status,
      approved: g.approved, pendingUpdate: !!g.pendingUpdate, hasContent: !!g.content, input: g.input || null,
      prompt: g.input ? manualPrompt(g.input) : "", current: g.content ? JSON.stringify(g.content.L, null, 2) : "",
      preview: g.content ? l.preview : null, guide: g.approved ? l.guide : null, approve: l.approve, edit: l.edit,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server" });
  }
}
