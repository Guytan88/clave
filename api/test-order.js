// GET /api/test-order?lang=he : creates a test purchase (no payment) and emails TEST_EMAIL.
// Only works while TEST_EMAIL is set in Vercel. Delete TEST_EMAIL to disable.
import handlerPaid from "./paid.js";
import { html } from "./_lib/core.js";

export default async function handler(req, res) {
  if (!process.env.TEST_EMAIL) return html(res, 404, "לא זמין", "<h2>בדיקות כבויות</h2>");
  const lang = ["es", "en", "he"].includes(req.query.lang) ? req.query.lang : "he";
  const out = {};
  const fake = { status: (c) => { out.code = c; return fake; }, json: (o) => { out.body = o; return fake; }, setHeader() {} };
  await handlerPaid({ method: "POST", body: { orderID: "TEST" + Date.now(), lang }, headers: req.headers }, fake);
  const ok = out.body?.mail === "sent";
  html(res, ok ? 200 : 500, "בדיקה", ok
    ? `<h2 style="margin-top:0">✓ נשלח מייל רכישה ל־${process.env.TEST_EMAIL.replace(/[<>&]/g, "")}</h2><p>אם הוא לא בתיבה הראשית, בדוק בספאם.</p>`
    : `<h2 style="margin-top:0">המייל לא נשלח</h2><p><code>${String(out.body?.mail || out.body?.error || "error").replace(/[<>&]/g, "")}</code></p>`);
}
