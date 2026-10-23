// Shared guide helpers: slug reservation and building the published content object.
import { db, randId, slugify } from "./core.js";

export async function ensureSlug(g) {
  if (g.slug) return g.slug;
  const root = slugify(g.input?.name);
  for (let n = 0; n < 6 && !g.slug; n++) {
    const s = `${root}-${randId(4)}`;
    if (await db.setNX(`s:${s}`, g.id)) g.slug = s;
  }
  if (!g.slug) throw new Error("could not reserve a slug");
  return g.slug;
}

export function assemble(i, L) {
  return {
    theme: i.theme, languages: i.languages, name: i.name, place: i.place, host: i.host,
    whatsapp: i.whatsapp.replace(/\D/g, ""), ci: i.ci, co: i.co,
    wifi: i.wifi_net || i.wifi_pw ? { net: i.wifi_net, pw: i.wifi_pw } : null, L,
  };
}
