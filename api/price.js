// GET : current price, launch status and spots left (for the landing page and example guide).
import { pricing } from "./_lib/core.js";

export default async function handler(req, res) {
  try {
    const p = await pricing();
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=30, stale-while-revalidate=120");
    res.json({ price: p.price, regular: p.regular, launch: p.launch, left: p.left, limit: p.limit });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server" });
  }
}
