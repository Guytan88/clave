// POST {orderID, lang} after PayPal capture: verify the payment, create the guide record, email the buyer.
import { db, cfg, body, getPayPalOrder, randId, randToken, saveGuide, loadGuide, siteUrl, links } from "./_lib/core.js";
import { mailPaid } from "./_lib/mail.js";

const mask = (e) => { const [u, d] = String(e || "").split("@"); return d ? `${u.slice(0, 2)}***@${d}` : ""; };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  const { orderID, lang } = body(req);
  const order = String(orderID || "");
  if (!/^[A-Z0-9]{8,40}$/.test(order)) return res.status(400).json({ error: "order" });
  const uiLang = ["es", "en", "pt", "fr", "he"].includes(lang) ? lang : "en";
  const base = siteUrl(req);

  try {
    const existing = await db.get(`o:${order}`);
    if (existing) {
      const g = await loadGuide(existing);
      if (g) return res.json({ editUrl: links(base, g).edit, email: mask(g.email) });
    }

    const o = await getPayPalOrder(order);
    const cap = o?.purchase_units?.[0]?.payments?.captures?.[0];
    if (!o || o.status !== "COMPLETED" || !cap) return res.status(402).json({ error: "not_paid" });
    if (Number(cap.amount?.value) < cfg.priceUsd || cap.amount?.currency_code !== "USD") return res.status(402).json({ error: "amount" });

    const g = {
      id: randId(10), token: randToken(), order, lang: uiLang,
      email: o.payer?.email_address || "", payer: o.payer?.name?.given_name || "",
      amount: `US$${cap.amount.value}`, status: "new", approved: false, edits: 0,
      created: new Date().toISOString(),
    };
    if (!(await db.setNX(`o:${order}`, g.id))) {           // another request won the race
      const g2 = await loadGuide(await db.get(`o:${order}`));
      return res.json({ editUrl: links(base, g2).edit });
    }
    await saveGuide(g);
    const l = links(base, g);
    let mail = "skipped";
    if (g.email) {
      try { await mailPaid(uiLang, g.email, { order, amount: g.amount, edit: l.edit }); mail = "sent"; }
      catch (e) { console.error("mailPaid failed", e); mail = "failed: " + String(e.message || e).slice(0, 200); }
    }
    return res.json({ editUrl: l.edit, email: mask(g.email) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server" });
  }
}
