// POST {id, k, content} : live editing of a published guide by its host. Saves and publishes immediately.
import { body, loadGuide, saveGuide, tokenOk, siteUrl, links } from "./_lib/core.js";
import { parseManual } from "./_lib/ai.js";
import { mailAdmin } from "./_lib/mail.js";
import { THEMES } from "../langs.js";

const str = (v, max) => String(v ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);
const time = (v) => (/^\d{1,2}:\d{2}$/.test(v || "") ? v : "");

function trimL(L) {
  const cut = (a, n, f) => (Array.isArray(a) ? a.slice(0, n).map(f) : []);
  for (const o of Object.values(L)) {
    o.note = str(o.note, 1500);
    o.arrival = cut(o.arrival, 10, (x) => str(x, 1200)).filter(Boolean);
    o.house = cut(o.house, 30, (h) => ({ t: str(h.t, 80), d: str(h.d, 1200) })).filter((h) => h.t);
    o.rules = cut(o.rules, 30, (x) => str(x, 400)).filter(Boolean);
    o.spots = cut(o.spots, 30, (x) => ({ cat: str(x.cat, 60), name: str(x.name, 120), text: str(x.text, 400), ...(str(x.dist, 40) ? { dist: str(x.dist, 40) } : {}) })).filter((x) => x.name);
    o.checkout = cut(o.checkout, 20, (x) => str(x, 300)).filter(Boolean);
    o.emergency = cut(o.emergency, 10, (x) => str(x, 120)).filter(Boolean);
  }
  return L;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "method" });
    const { id, k, content: c } = body(req);
    const g = await loadGuide(String(id || ""));
    if (!tokenOk(g, k)) return res.status(404).json({ error: "not_found" });
    if (!g.approved || !g.content) return res.status(409).json({ error: "not_published" });
    if (!c || typeof c !== "object") return res.status(400).json({ error: "bad" });

    let L;
    try { L = trimL(parseManual(JSON.stringify(c.L || {}), g.content.languages)); }
    catch (e) { return res.status(400).json({ error: "bad", detail: e.message }); }

    const n = {
      ...g.content,
      theme: THEMES.includes(c.theme) ? c.theme : g.content.theme,
      name: str(c.name, 80) || g.content.name, place: str(c.place, 120), host: str(c.host, 60) || g.content.host,
      whatsapp: str(c.whatsapp, 30).replace(/\D/g, "") || g.content.whatsapp,
      ci: time(c.ci), co: time(c.co), L,
    };
    const net = str(c.wifi?.net, 60), pw = str(c.wifi?.pw, 60);
    n.wifi = net || pw ? { net, pw } : null;
    g.content = n;
    Object.assign(g.input || (g.input = {}), { theme: n.theme, name: n.name, place: n.place, host: n.host, whatsapp: n.whatsapp, ci: n.ci, co: n.co, wifi_net: net, wifi_pw: pw });
    g.status = "published"; g.pendingUpdate = false; g.liveEdits = (g.liveEdits || 0) + 1;
    await saveGuide(g);
    await mailAdmin("edited", g, links(siteUrl(req), g)).catch((e) => console.error("admin mail", e));
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server" });
  }
}
