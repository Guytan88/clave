// Shared helpers: config, storage (Upstash Redis REST), PayPal, crypto, HTTP utils.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const DEV = process.env.CLAVE_DEV === "1";

export const cfg = {
  priceUsd: Number(process.env.PRICE_USD || 1), // TEMP TEST — restore to 49
  adminEmail: process.env.ADMIN_EMAIL || process.env.GMAIL_USER || "shasi.contact@gmail.com",
  adminSecret: process.env.ADMIN_SECRET || (DEV ? "dev-secret" : ""),
  siteUrl: (process.env.SITE_URL || "").replace(/\/$/, ""),
  maxEdits: Number(process.env.MAX_EDITS || 40),
};

export function siteUrl(req) {
  if (cfg.siteUrl) return cfg.siteUrl;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || (DEV ? "http" : "https");
  return `${proto}://${host}`;
}

/* ---------------- Storage: Supabase (Postgres) table "clave" (key text, value jsonb) ---------------- */
const SB_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SB_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEV_FILE = path.join(process.cwd(), ".dev-data", "db.json");

function sbHeaders(extra = {}) {
  const h = { apikey: SB_KEY, "Content-Type": "application/json", ...extra };
  if (SB_KEY?.startsWith("eyJ")) h.Authorization = `Bearer ${SB_KEY}`; // legacy service_role JWT
  return h;
}
async function sbGet(key) {
  const r = await fetch(`${SB_URL}/rest/v1/clave?key=eq.${encodeURIComponent(key)}&select=value`, { headers: sbHeaders() });
  if (!r.ok) throw new Error(`supabase get ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const rows = await r.json();
  return rows.length ? rows[0].value : null;
}
async function sbPut(key, value, onlyIfNew) {
  const r = await fetch(`${SB_URL}/rest/v1/clave`, {
    method: "POST",
    headers: sbHeaders({ Prefer: onlyIfNew ? "return=minimal" : "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
  if (onlyIfNew && r.status === 409) return false;
  if (!r.ok) throw new Error(`supabase put ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return true;
}

function devDb() { try { return JSON.parse(fs.readFileSync(DEV_FILE, "utf8")); } catch { return {}; } }
function devSave(d) { fs.mkdirSync(path.dirname(DEV_FILE), { recursive: true }); fs.writeFileSync(DEV_FILE, JSON.stringify(d, null, 1)); }
function store() {
  if (SB_URL && SB_KEY) return { get: sbGet, put: sbPut };
  if (!DEV) throw new Error("Storage is not configured (SUPABASE_URL / SUPABASE_SECRET_KEY missing)");
  return {
    get: async (k) => devDb()[k] ?? null,
    put: async (k, v, onlyIfNew) => { const d = devDb(); if (onlyIfNew && k in d) return false; d[k] = v; devSave(d); return true; },
  };
}
export const db = {
  get: (k) => store().get(k),
  setNX: (k, v) => store().put(k, v, true),
  getJSON: (k) => store().get(k),
  setJSON: (k, v) => store().put(k, v, false),
};
export const guideKey = (id) => `g:${id}`;
export async function loadGuide(id) { return /^[a-z0-9]{6,20}$/.test(id || "") ? db.getJSON(guideKey(id)) : null; }
export async function saveGuide(g) { g.updated = new Date().toISOString(); await db.setJSON(guideKey(g.id), g); }

/* ---------------- Crypto ---------------- */
export const randId = (n = 10) => {
  const a = "abcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(crypto.randomBytes(n), (b) => a[b % a.length]).join("");
};
export const randToken = () => crypto.randomBytes(18).toString("base64url");
export function sign(msg) {
  if (!cfg.adminSecret) throw new Error("ADMIN_SECRET missing");
  return crypto.createHmac("sha256", cfg.adminSecret).update(msg).digest("base64url").slice(0, 32);
}
export function safeEq(a, b) {
  a = Buffer.from(String(a || "")); b = Buffer.from(String(b || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export const checkSig = (msg, sig) => { try { return safeEq(sign(msg), sig); } catch { return false; } };
export const tokenOk = (g, k) => g && safeEq(g.token, k);

/* ---------------- PayPal ---------------- */
const PP_API = process.env.PAYPAL_API || "https://api-m.paypal.com";
export async function getPayPalOrder(orderId) {
  if (DEV && orderId.startsWith("TEST")) {
    return { id: orderId, status: "COMPLETED", payer: { email_address: "buyer@example.com", name: { given_name: "Test" } },
      purchase_units: [{ payments: { captures: [{ amount: { value: String(cfg.priceUsd.toFixed(2)), currency_code: "USD" } }] } }] };
  }
  const id = process.env.PAYPAL_CLIENT_ID, secret = process.env.PAYPAL_SECRET;
  if (!id || !secret) throw new Error("PayPal keys missing");
  const t = await fetch(`${PP_API}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!t.ok) throw new Error("PayPal token " + t.status);
  const { access_token } = await t.json();
  const r = await fetch(`${PP_API}/v2/checkout/orders/${encodeURIComponent(orderId)}`, { headers: { Authorization: `Bearer ${access_token}` } });
  return r.ok ? r.json() : null;
}

/* ---------------- HTTP ---------------- */
export function body(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body || "{}"); } catch { return {}; }
}
export function later(promise) {
  // Keep the function alive after the response (Vercel's waitUntil), without extra dependencies.
  const p = Promise.resolve(promise).catch((e) => console.error("background task failed", e));
  try {
    const ctx = globalThis[Symbol.for("@vercel/request-context")]?.get?.();
    if (ctx?.waitUntil) { ctx.waitUntil(p); return; }
  } catch {}
  if (DEV) return; // local server stays alive anyway
}
export function html(res, status, title, inner) {
  res.status(status).setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<body style="margin:0;background:#EDEFEA;font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#1D2B24;display:grid;place-items:center;min-height:100vh;padding:20px">
<div style="background:#fff;border-radius:18px;padding:30px 26px;max-width:460px;width:100%;line-height:1.6">${inner}</div></body></html>`);
}
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function slugify(s) {
  const base = String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return base || "guia";
}

export function links(base, g) {
  return {
    edit: `${base}/edit?id=${g.id}&k=${g.token}`,
    guide: g.slug ? `${base}/g/${g.slug}` : null,
    preview: g.slug ? `${base}/g/${g.slug}?p=${sign("preview:" + g.id)}` : null,
    approve: `${base}/api/approve?id=${g.id}&s=${sign("approve:" + g.id)}`,
    admin: `${base}/admin?id=${g.id}&s=${sign("admin:" + g.id)}`,
  };
}
