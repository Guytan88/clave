// POST {id, k, input} : host submits/edits the form → generate content with AI in the background.
import { db, cfg, body, loadGuide, saveGuide, tokenOk, later, siteUrl, links, randId, slugify } from "./_lib/core.js";
import { buildContent } from "./_lib/ai.js";
import { mailAdmin } from "./_lib/mail.js";
import { LANG, THEMES } from "../langs.js";

const str = (v, max) => String(v ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);

function clean(raw) {
  const i = {
    theme: THEMES.includes(raw.theme) ? raw.theme : null,
    languages: [...new Set((Array.isArray(raw.languages) ? raw.languages : []).filter((c) => LANG[c]))].slice(0, 20),
    host: str(raw.host, 60), name: str(raw.name, 80), place: str(raw.place, 120),
    whatsapp: str(raw.whatsapp, 30).replace(/[^\d+]/g, ""),
    ci: /^\d{1,2}:\d{2}$/.test(raw.ci || "") ? raw.ci : "", co: /^\d{1,2}:\d{2}$/.test(raw.co || "") ? raw.co : "",
    wifi_net: str(raw.wifi_net, 60), wifi_pw: str(raw.wifi_pw, 60),
    welcome: str(raw.welcome, 1500),
    mode: raw.mode === "paste" ? "paste" : "fields",
    paste: str(raw.paste, 15000),
    arrival: str(raw.arrival, 3000), house: str(raw.house, 6000), rules: str(raw.rules, 3000), checkout: str(raw.checkout, 3000),
    recs: str(raw.recs, 5000), emergency: str(raw.emergency, 600),
  };
  const missing = [];
  if (!i.theme) missing.push("theme");
  if (!i.languages.length) missing.push("languages");
  for (const f of ["host", "name", "place"]) if (!i[f]) missing.push(f);
  if (i.whatsapp.replace(/\D/g, "").length < 7) missing.push("whatsapp");
  if (i.mode === "paste" ? i.paste.length < 20 : !(i.house || i.rules || i.arrival || i.checkout)) missing.push("content");
  return { i, missing };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  const { id, k, input } = body(req);
  const g = await loadGuide(String(id || ""));
  if (!tokenOk(g, k)) return res.status(404).json({ error: "not_found" });
  if (g.status === "processing" && Date.now() - Date.parse(g.updated) < 6 * 60 * 1000) return res.status(409).json({ error: "busy" });
  if ((g.edits || 0) >= cfg.maxEdits) return res.status(429).json({ error: "too_many_edits" });

  const { i, missing } = clean(input || {});
  if (missing.length) return res.status(400).json({ error: "missing", fields: missing });

  g.input = i; g.status = "processing"; g.edits = (g.edits || 0) + 1; delete g.error;
  await saveGuide(g);
  later(generate(g.id, siteUrl(req)));
  res.json({ ok: true, status: "processing" });
}

async function generate(id, base) {
  let g = await loadGuide(id);
  const i = g.input;
  try {
    const L = await buildContent(i);
    g = await loadGuide(id);                       // re-read: keep anything that changed meanwhile
    if (!g.slug) {
      const root = slugify(i.name);
      for (let n = 0; n < 5 && !g.slug; n++) {
        const s = `${root}-${randId(4)}`;
        if (await db.setNX(`s:${s}`, g.id)) g.slug = s;
      }
    }
    g.content = {
      theme: i.theme, languages: i.languages, name: i.name, place: i.place, host: i.host,
      whatsapp: i.whatsapp.replace(/\D/g, ""), ci: i.ci, co: i.co,
      wifi: i.wifi_net || i.wifi_pw ? { net: i.wifi_net, pw: i.wifi_pw } : null, L,
    };
    g.status = g.approved ? "published" : "review";
    await saveGuide(g);
    await mailAdmin(g.approved ? "edited" : "review", g, links(base, g)).catch((e) => console.error("admin mail", e));
  } catch (e) {
    console.error("generate failed", e);
    g = await loadGuide(id);
    g.status = "error"; g.error = String(e.message || e).slice(0, 300);
    await saveGuide(g);
    await mailAdmin("error", g, links(base, g)).catch(() => {});
  }
}
