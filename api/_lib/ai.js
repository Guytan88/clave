// Turns the host's form answers into guide content, then translates it, using the Claude API.
import { DEV } from "./core.js";
import { LANG } from "../../langs.js";

const MODEL = process.env.AI_MODEL || "claude-sonnet-5-5";
const API = "https://api.anthropic.com/v1/messages";

export const UI_KEYS = ["welcome_to", "checkin", "checkout", "network", "copy", "copied", "toc", "arrival", "house", "rules",
  "recs", "before_leave", "contact", "contact_text", "message_host", "emergency", "sign", "made_with", "language"];

const S = { type: "string" };
const LANG_SCHEMA = {
  type: "object",
  required: ["ui", "note", "arrival", "house", "rules", "spots", "checkout", "emergency"],
  properties: {
    ui: { type: "object", required: UI_KEYS, properties: Object.fromEntries(UI_KEYS.map((k) => [k, S])) },
    note: S,
    arrival: { type: "array", items: S },
    house: { type: "array", items: { type: "object", required: ["t", "d"], properties: { t: S, d: S } } },
    rules: { type: "array", items: S },
    spots: { type: "array", items: { type: "object", required: ["cat", "name", "text"], properties: { cat: S, name: S, text: S, dist: S } } },
    checkout: { type: "array", items: S },
    emergency: { type: "array", items: S },
  },
};

const UI_HINT = `ui labels (short, natural, for the guest-facing page):
welcome_to = "Welcome to" (followed by the property name), checkin = "Check-in", checkout = "Check-out", network = "Network", copy = "Copy password", copied = "Copied",
toc = "In this guide", arrival = "Your arrival", house = "The place", rules = "House rules", recs = "Recommendations", before_leave = "Before you leave",
contact = "Need anything?", contact_text = "Message me anytime.", message_host = "Message {host}" (keep the literal {host} placeholder), emergency = "Emergencies",
sign = "Warmly," (closing before the host's name), made_with = "Guide made with Clave", language = "Language".`;

const RULES = `You write the content of a digital house guide that a short-term rental host shares with guests.
Rules:
- Use ONLY facts the host gave. Never invent places, times, phone numbers, rules, distances or amenities.
- NEVER include door codes, key-box/lockbox codes, gate codes, alarm codes, unit/apartment numbers or step-by-step access instructions, even if the host wrote them. Instead, arrival must include one sentence saying access instructions are sent by message on arrival day.
- The wifi network and password are shown elsewhere on the page; do not repeat them in the text.
- If the host pasted their usual WhatsApp messages instead of filling sections, sort that text into arrival notes, house instructions, rules, recommendations and checkout steps. Drop greetings, prices, dates and anything about one specific stay or guest.
- arrival: 1-3 short paragraphs. Mention check-in time if given.
- house: one item per topic (title of 1-3 words + 1-2 sentences).
- rules and checkout: one short line each.
- spots (recommendations): name exactly as the host wrote it, one line on why it's worth it, "cat" = a 1-3 word category (e.g. "To eat", "Beach"), "dist" only if the host gave a distance/time, otherwise omit it. Group spots of the same category together.
- emergency: one line per number the host gave, as "description: number" (translate the description, keep the number exactly). If the host gave none, use the official national emergency number of the property's country (one line).
- note: if the host wrote a welcome message, use it (cleaned up). Otherwise write a warm 2-sentence welcome.
- Empty sections are empty arrays. Warm, clear, concise tone. Plain text only, no markdown, no emojis.`;

async function callTool(system, user, maxTokens = 8000) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY missing");
  const payload = {
    model: MODEL, max_tokens: maxTokens, system,
    tools: [{ name: "save_guide_language", description: "Save the guide content for one language.", input_schema: LANG_SCHEMA }],
    tool_choice: { type: "tool", name: "save_guide_language" },
    messages: [{ role: "user", content: user }],
  };
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch(API, {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (r.ok) {
      const j = await r.json();
      const block = (j.content || []).find((b) => b.type === "tool_use");
      if (block?.input?.ui) return block.input;
      lastErr = new Error("AI returned no content");
    } else {
      lastErr = new Error(`AI ${r.status}: ${(await r.text()).slice(0, 300)}`);
      if (![408, 429, 500, 502, 503, 504, 529].includes(r.status)) throw lastErr;
    }
    const wait = Number(r.headers.get("retry-after")) * 1000 || 2000 * 2 ** attempt;
    await new Promise((res) => setTimeout(res, Math.min(wait, 20000)));
  }
  throw lastErr;
}

function describeInput(i) {
  const lines = [
    `Property name: ${i.name}`, `City / area: ${i.place}`, `Host first name: ${i.host}`,
    i.ci && `Check-in time: ${i.ci}`, i.co && `Check-out time: ${i.co}`,
    i.welcome && `Welcome message from the host:\n${i.welcome}`,
  ];
  if (i.mode === "paste") lines.push(`The host pasted the messages they usually send guests:\n"""\n${i.paste}\n"""`);
  else lines.push(
    i.arrival && `Arrival notes:\n${i.arrival}`, i.house && `House instructions:\n${i.house}`,
    i.rules && `House rules:\n${i.rules}`, i.checkout && `Before leaving / checkout:\n${i.checkout}`);
  lines.push(i.recs && `Recommendations:\n${i.recs}`, i.emergency && `Emergency numbers:\n${i.emergency}`);
  return lines.filter(Boolean).join("\n\n");
}

async function pool(items, n, fn) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

export async function buildContent(input) {
  const [first, ...rest] = input.languages;
  if (DEV && !process.env.ANTHROPIC_API_KEY) return devContent(input);
  const base = await callTool(
    `${RULES}\n\nWrite everything in ${LANG[first].en}.\n${UI_HINT}`,
    `Here are the host's answers. Build the guide.\n\n${describeInput(input)}`);
  const L = { [first]: base };
  await pool(rest, 4, async (code) => {
    L[code] = await callTool(
      `You translate a guest guide into ${LANG[code].en}. Keep the exact same JSON structure and number of items. Translate naturally for travellers. Do not translate proper names of places, businesses or people, phone numbers or times. Keep the literal {host} placeholder. Plain text only.`,
      `Translate this guide content into ${LANG[code].en}:\n\n${JSON.stringify(base)}`);
  });
  return L;
}

// Offline stand-in used only for local testing without an API key.
function devContent(input) {
  const L = {};
  for (const code of input.languages) {
    L[code] = {
      ui: Object.fromEntries(UI_KEYS.map((k) => [k, { welcome_to: "Bienvenidos a", message_host: "Escribirle a {host}", sign: "Con cariño,", checkin: "Check-in", checkout: "Check-out", network: "Red", copy: "Copiar clave", copied: "Copiada" }[k] || `[${code}] ${k}`])),
      note: `[${code}] Gracias por elegir ${input.name}.`,
      arrival: [`[${code}] El check-in es a partir de las ${input.ci || "15:00"}. Te enviaré las instrucciones de acceso por mensaje.`],
      house: [{ t: "Wifi", d: "Router en la sala." }, { t: "Agua caliente", d: "Tarda 10 minutos." }],
      rules: ["Silencio desde las 22:00.", "No fumar dentro."],
      spots: [{ cat: "Para comer", name: "Mercado Central", text: "Barato y rico.", dist: "5 min a pie" }],
      checkout: ["Deja las llaves en la mesa."],
      emergency: ["Emergencias: 911"],
    };
  }
  return L;
}

/* ---------------- Manual mode: a prompt to paste into Claude, and validation of its JSON answer ---------------- */
export const autoAI = () => !!process.env.ANTHROPIC_API_KEY && process.env.AI_MODE !== "manual";

export function manualPrompt(input) {
  const langs = input.languages.map((c) => `"${c}" (${LANG[c].en})`).join(", ");
  const shape = `{
  "<language code>": {
    "ui": { ${UI_KEYS.map((k) => `"${k}": "…"`).join(", ")} },
    "note": "…",
    "arrival": ["paragraph", "…"],
    "house": [{ "t": "short title", "d": "1-2 sentences" }],
    "rules": ["one line", "…"],
    "spots": [{ "cat": "category", "name": "place name", "text": "one line", "dist": "only if the host gave it" }],
    "checkout": ["one line", "…"],
    "emergency": ["Ambulance: 911"]
  }
}`;
  return `${RULES}

${UI_HINT}

Write the guide in these languages: ${langs}. Write it naturally in the first language, then translate the same content into the others (same items, same order). Do not translate names of places, businesses or people, phone numbers or times. Keep the literal {host} placeholder in ui.message_host.

Answer with ONLY one valid JSON object (no markdown, no explanation), with one key per language code, in this shape:
${shape}

Here are the host's answers:

${describeInput(input)}`;
}

export function parseManual(text, languages) {
  let s = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b < a) throw new Error("לא נמצא JSON בטקסט");
  let j;
  try { j = JSON.parse(s.slice(a, b + 1)); } catch (e) { throw new Error("ה-JSON לא תקין: " + e.message); }
  const L = {};
  for (const code of languages) {
    const o = j[code];
    if (!o || typeof o !== "object") throw new Error(`חסרה השפה ${code}`);
    if (!o.ui || typeof o.ui !== "object") throw new Error(`חסר "ui" בשפה ${code}`);
    const missingUi = UI_KEYS.filter((k) => typeof o.ui[k] !== "string");
    if (missingUi.length) throw new Error(`בשפה ${code} חסרות תוויות: ${missingUi.join(", ")}`);
    const arr = (v) => (Array.isArray(v) ? v : []);
    L[code] = {
      ui: Object.fromEntries(UI_KEYS.map((k) => [k, String(o.ui[k])])),
      note: String(o.note || ""),
      arrival: arr(o.arrival).map(String),
      house: arr(o.house).filter((h) => h && h.t).map((h) => ({ t: String(h.t), d: String(h.d || "") })),
      rules: arr(o.rules).map(String),
      spots: arr(o.spots).filter((x) => x && x.name).map((x) => ({ cat: String(x.cat || ""), name: String(x.name), text: String(x.text || ""), ...(x.dist ? { dist: String(x.dist) } : {}) })),
      checkout: arr(o.checkout).map(String),
      emergency: arr(o.emergency).map(String),
    };
  }
  return L;
}
