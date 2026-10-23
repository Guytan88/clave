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
      btn(o.edit, "Completar los datos de mi alojamiento") + p("¿Preguntas? Responde a este correo."),
    ready_s: "Tu guía está lista",
    ready: (o) => p("¡Tu guía ya está en línea! Aquí tienes tus dos enlaces:") +
      p("<b>1. Enlace para tus huéspedes</b><br>Pégalo en Airbnb → Mensajes → Mensajes programados, en tu mensaje de bienvenida.") + btn(o.guide, "Ver mi guía") +
      p(`<a href="${o.guide}">${esc(o.guide)}</a>`) +
      p("<b>2. Enlace para editar (solo para ti, no lo compartas)</b><br>Cambia textos, horarios, wifi o el estilo cuando quieras; se actualiza al instante.") + btn(o.edit, "Editar mi guía", "#1D2B24", "#fff") +
      p("Las instrucciones de acceso (códigos, llaves) envíalas aparte, como siempre. Tu guía está garantizada en línea por al menos 12 meses.") + p("¡Felices reservas!"),
  },
  en: {
    paid_s: "Payment received · Fill in your guide details",
    paid: (o) => p("Hi! I've received your payment. Thank you for choosing Clave.") + p(`Order: <b>${esc(o.order)}</b> · Amount: <b>${esc(o.amount)}</b>`) +
      p("Now tell me about your place: fill in a few short fields or simply paste the WhatsApp messages you already send your guests. It takes about 5 minutes.") +
      btn(o.edit, "Fill in my property details") + p("Questions? Just reply to this email."),
    ready_s: "Your guide is ready",
    ready: (o) => p("Your guide is live! Here are your two links:") +
      p("<b>1. Link for your guests</b><br>Paste it in Airbnb → Messages → Scheduled messages, in your welcome message.") + btn(o.guide, "View my guide") +
      p(`<a href="${o.guide}">${esc(o.guide)}</a>`) +
      p("<b>2. Link to edit (just for you, don't share it)</b><br>Change texts, times, wifi or the style anytime; it updates instantly.") + btn(o.edit, "Edit my guide", "#1D2B24", "#fff") +
      p("Send access instructions (codes, keys) separately, as usual. Your guide is guaranteed online for at least 12 months.") + p("Happy hosting!"),
  },
  he: {
    paid_s: "התשלום התקבל · מלאו את פרטי המדריך",
    paid: (o) => p("שלום! התשלום התקבל, תודה שבחרת ב־Clave.") + p(`הזמנה: <b>${esc(o.order)}</b> · סכום: <b>${esc(o.amount)}</b>`) +
      p("עכשיו ספרו לי על הנכס: ממלאים כמה שדות קצרים, או פשוט מדביקים את הודעות הוואטסאפ שאתם כבר שולחים לאורחים. לוקח בערך 5 דקות.") +
      btn(o.edit, "למילוי פרטי הנכס") + p("שאלות? פשוט עונים למייל."),
    ready_s: "המדריך שלך מוכן",
    ready: (o) => p("המדריך שלך באוויר! הנה שני הקישורים שלך:") +
      p("<b>1. קישור לאורחים</b><br>מדביקים באיירביאנבי ← הודעות ← הודעות מתוזמנות, בהודעת הפתיחה.") + btn(o.guide, "לצפייה במדריך") +
      p(`<a href="${o.guide}">${esc(o.guide)}</a>`) +
      p("<b>2. קישור לעריכה (רק לך, לא לשתף)</b><br>משנים טקסטים, שעות, וויי־פיי או סגנון מתי שרוצים; המדריך מתעדכן מיד.") + btn(o.edit, "לעריכת המדריך", "#1D2B24", "#fff") +
      p("את הוראות הכניסה (קודים, מפתחות) שולחים בנפרד, כרגיל. המדריך באוויר באחריות לפחות 12 חודשים.") + p("בהצלחה!"),
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
