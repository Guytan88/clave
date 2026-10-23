// Email sending (Gmail SMTP with an app password) + the email templates.
import fs from "node:fs";
import path from "node:path";
import { DEV, cfg, esc } from "./core.js";

let transport;
export async function send({ to, subject, html, text, replyTo }) {
  if (DEV && !process.env.GMAIL_APP_PASSWORD) {
    const dir = path.join(process.cwd(), ".dev-data", "mail");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${Date.now()}-${to.replace(/[^a-z0-9]/gi, "_")}.html`),
      `<!-- to: ${to}\nsubject: ${subject} -->\n${html}`);
    return;
  }
  if (!transport) {
    const nodemailer = (await import("nodemailer")).default;
    transport = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } });
  }
  await transport.sendMail({ from: `"Clave" <${process.env.GMAIL_USER}>`, to, subject, html, text, replyTo });
}

/* ---------------- Templates ---------------- */
function layout(lang, inner) {
  const dir = lang === "he" ? "rtl" : "ltr";
  return `<div dir="${dir}" style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#1D2B24;max-width:540px;margin:0 auto;padding:8px">
<p style="font-size:22px;font-weight:bold;margin:0 0 18px;letter-spacing:-.01em">Clave</p>${inner}
<p style="font-size:13px;color:#56625B;margin-top:28px;border-top:1px solid #E1E5DE;padding-top:14px">Clave · ${esc(cfg.adminEmail)}</p></div>`;
}
const btn = (href, label, bg = "#F2B632", fg = "#1D2B24") =>
  `<p style="margin:20px 0"><a href="${href}" style="background:${bg};color:${fg};text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:10px;display:inline-block">${esc(label)}</a></p>`;
const p = (s) => `<p style="margin:0 0 14px">${s}</p>`;

const T = {
  es: {
    paid_s: "Pago recibido · Completa los datos de tu guía",
    paid: (o) => p("¡Hola! Recibí tu pago, gracias por confiar en Clave.") + p(`Pedido: <b>${esc(o.order)}</b> · Monto: <b>${esc(o.amount)}</b>`) +
      p("Ahora cuéntame de tu alojamiento: llena unos campos cortos o simplemente pega los mensajes de WhatsApp que ya les mandas a tus huéspedes. Toma unos 5 minutos.") +
      btn(o.edit, "Completar los datos de mi alojamiento") + p("Guarda este correo: con el mismo enlace podrás editar tu guía cuando quieras.") + p("¿Preguntas? Responde a este correo."),
    ready_s: "Tu guía está lista",
    ready: (o) => p("¡Tu guía ya está en línea!") + btn(o.guide, "Ver mi guía") +
      p(`Enlace para tus huéspedes:<br><a href="${o.guide}">${esc(o.guide)}</a>`) +
      p("<b>Cómo usarla:</b> en Airbnb, ve a Mensajes → Mensajes programados y pega el enlace en tu mensaje de bienvenida. Las instrucciones de acceso (códigos, llaves) envíalas aparte, como siempre.") +
      p(`<b>Para editarla</b> (solo tú, no compartas este enlace):<br><a href="${o.edit}">${esc(o.edit)}</a>`) +
      p("Puedes editarla cuando quieras durante el año. Está garantizada en línea por al menos 12 meses.") + p("¡Felices reservas!"),
  },
  en: {
    paid_s: "Payment received · Fill in your guide details",
    paid: (o) => p("Hi! I've received your payment. Thank you for choosing Clave.") + p(`Order: <b>${esc(o.order)}</b> · Amount: <b>${esc(o.amount)}</b>`) +
      p("Now tell me about your place: fill in a few short fields or simply paste the WhatsApp messages you already send your guests. It takes about 5 minutes.") +
      btn(o.edit, "Fill in my property details") + p("Keep this email: the same link lets you edit your guide anytime.") + p("Questions? Just reply to this email."),
    ready_s: "Your guide is ready",
    ready: (o) => p("Your guide is live!") + btn(o.guide, "View my guide") +
      p(`Link for your guests:<br><a href="${o.guide}">${esc(o.guide)}</a>`) +
      p("<b>How to use it:</b> in Airbnb, go to Messages → Scheduled messages and paste the link into your welcome message. Send access instructions (codes, keys) separately, as usual.") +
      p(`<b>To edit it</b> (just you, don't share this link):<br><a href="${o.edit}">${esc(o.edit)}</a>`) +
      p("You can edit it anytime during the year. It's guaranteed online for at least 12 months.") + p("Happy hosting!"),
  },
  he: {
    paid_s: "התשלום התקבל · מלאו את פרטי המדריך",
    paid: (o) => p("שלום! התשלום התקבל, תודה שבחרת ב־Clave.") + p(`הזמנה: <b>${esc(o.order)}</b> · סכום: <b>${esc(o.amount)}</b>`) +
      p("עכשיו ספרו לי על הנכס: ממלאים כמה שדות קצרים, או פשוט מדביקים את הודעות הוואטסאפ שאתם כבר שולחים לאורחים. לוקח בערך 5 דקות.") +
      btn(o.edit, "למילוי פרטי הנכס") + p("שמרו את המייל הזה: עם אותו קישור אפשר לערוך את המדריך מתי שרוצים.") + p("שאלות? פשוט עונים למייל."),
    ready_s: "המדריך שלך מוכן",
    ready: (o) => p("המדריך שלך באוויר!") + btn(o.guide, "לצפייה במדריך") +
      p(`הלינק לאורחים:<br><a href="${o.guide}">${esc(o.guide)}</a>`) +
      p("<b>איך משתמשים:</b> באיירביאנבי נכנסים להודעות ← הודעות מתוזמנות ומדביקים את הלינק בהודעת הפתיחה. את הוראות הכניסה (קודים, מפתחות) שולחים בנפרד, כרגיל.") +
      p(`<b>לעריכה</b> (רק לך, לא לשתף):<br><a href="${o.edit}">${esc(o.edit)}</a>`) +
      p("אפשר לערוך מתי שרוצים במהלך השנה. המדריך באוויר באחריות לפחות 12 חודשים.") + p("בהצלחה!"),
  },
};
const t = (lang) => T[lang] || T.en;

export const mailPaid = (lang, to, o) => send({ to, subject: t(lang).paid_s, html: layout(lang, t(lang).paid(o)), replyTo: cfg.adminEmail });
export const mailReady = (lang, to, o) => send({ to, subject: t(lang).ready_s, html: layout(lang, t(lang).ready(o)), replyTo: cfg.adminEmail });

// Admin (Hebrew)
export function mailAdmin(kind, g, l) {
  const name = esc(g.input?.name || g.id);
  const who = `${esc(g.email)} · הזמנה ${esc(g.order)}`;
  const parts = {
    review: [`מדריך חדש ממתין לאישור: ${g.input?.name || ""}`,
      p(`<b>${name}</b><br>${who}`) + p("בדוק את המדריך. אם הכל תקין, לחץ על אישור: הלקוח יקבל מייל עם הלינק למדריך ולעריכה.") +
      btn(l.preview, "תצוגה מקדימה", "#1D2B24", "#fff") + btn(l.approve, "אישור ושליחה ללקוח", "#2E5E4E", "#fff") +
      p(`צריך לתקן? פתח את דף העריכה, שנה ושמור, ותקבל מייל חדש לאישור:<br><a href="${l.edit}">דף העריכה</a>`)],
    edited: [`לקוח עדכן מדריך: ${g.input?.name || ""}`,
      p(`<b>${name}</b><br>${who}`) + p("הלקוח שמר שינויים והמדריך עודכן אוטומטית.") + btn(l.guide, "לצפייה במדריך", "#1D2B24", "#fff")],
    manual: [`מדריך חדש להכנה: ${g.input?.name || ""}`,
      p(`<b>${name}</b><br>${who}`) + p("הלקוח מילא את הטופס. בדף ההכנה יש את התשובות שלו ופרומפט מוכן: מעתיקים ל-Claude, מדביקים בחזרה את התשובה, בודקים בתצוגה מקדימה ומאשרים.") +
      btn(l.admin, "לדף ההכנה", "#2E5E4E", "#fff")],
    manual_update: [`לקוח ביקש לעדכן מדריך: ${g.input?.name || ""}`,
      p(`<b>${name}</b><br>${who}`) + p("הלקוח שמר שינויים בטופס. המדריך הנוכחי נשאר באוויר עד שתעדכן אותו בדף ההכנה (העדכון מתפרסם מיד כשאתה שומר).") +
      btn(l.admin, "לדף ההכנה", "#2E5E4E", "#fff")],
    error: [`שגיאה ביצירת מדריך: ${g.input?.name || g.id}`,
      p(`<b>${name}</b><br>${who}`) + p(`השגיאה: <code>${esc(g.error)}</code>`) + p(`אפשר לנסות שוב מדף העריכה: <a href="${l.edit}">דף העריכה</a>`)],
  }[kind];
  return send({ to: cfg.adminEmail, subject: parts[0], html: layout("he", parts[1]) });
}
