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
// Big, full-width call to action placed at the very top, with a plain link under it as a fallback.
const bigBtn = (href, label, hint) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 8px"><tr><td align="center" bgcolor="#F2B632" style="border-radius:12px">` +
  `<a href="${href}" style="display:block;padding:18px 20px;font-size:19px;font-weight:bold;color:#1D2B24;text-decoration:none;border-radius:12px">${esc(label)}</a></td></tr></table>` +
  `<p style="margin:0 0 22px;font-size:13px;color:#56625B">${esc(hint)}<br><a href="${href}" style="color:#2E5E4E;word-break:break-all">${esc(href)}</a></p>`;

const T = {
  es: {
    paid_s: (o) => `Pago recibido · Pedido ${o.order} · Completa tu formulario`,
    paid: (o) => p("<b>¡Gracias! Recibí tu pago.</b> El último paso es contarme de tu alojamiento:") +
      bigBtn(o.edit, "Completar el formulario →", "¿El botón no funciona? Copia este enlace en tu navegador:") +
      p("Toma unos 5 minutos: llenas unos campos cortos o simplemente pegas los mensajes de WhatsApp que ya les mandas a tus huéspedes. En menos de 24 horas te llega tu guía.") +
      p(`<span style="color:#56625B;font-size:14px">Pedido: <b>${esc(o.order)}</b> · Monto: <b>${esc(o.amount)}</b></span>`) + p("¿Preguntas? Responde a este correo."),
    ready_s: (o) => `Tu guía de ${o.name} está lista`,
    ready: (o) => p("¡Tu guía ya está en línea! Aquí tienes tus dos enlaces:") +
      p("<b>1. Enlace para tus huéspedes</b><br>Pégalo en Airbnb → Mensajes → Mensajes programados, en tu mensaje de bienvenida.") + btn(o.guide, "Ver mi guía") +
      p(`<a href="${o.guide}">${esc(o.guide)}</a>`) +
      p("<b>2. Enlace para editar (solo para ti, no lo compartas)</b><br>Cambia textos, horarios, wifi o el estilo cuando quieras; se actualiza al instante.") + btn(o.edit, "Editar mi guía", "#1D2B24", "#fff") +
      p("Las instrucciones de acceso (códigos, llaves) envíalas aparte, como siempre. Tu guía está garantizada en línea por al menos 12 meses.") + p("¡Felices reservas!"),
  },
  en: {
    paid_s: (o) => `Payment received · Order ${o.order} · Fill in your form`,
    paid: (o) => p("<b>Thank you! I've received your payment.</b> The last step is to tell me about your place:") +
      bigBtn(o.edit, "Fill in the form →", "Button not working? Copy this link into your browser:") +
      p("It takes about 5 minutes: fill in a few short fields or simply paste the WhatsApp messages you already send your guests. Your guide arrives within 24 hours.") +
      p(`<span style="color:#56625B;font-size:14px">Order: <b>${esc(o.order)}</b> · Amount: <b>${esc(o.amount)}</b></span>`) + p("Questions? Just reply to this email."),
    ready_s: (o) => `Your guide for ${o.name} is ready`,
    ready: (o) => p("Your guide is live! Here are your two links:") +
      p("<b>1. Link for your guests</b><br>Paste it in Airbnb → Messages → Scheduled messages, in your welcome message.") + btn(o.guide, "View my guide") +
      p(`<a href="${o.guide}">${esc(o.guide)}</a>`) +
      p("<b>2. Link to edit (just for you, don't share it)</b><br>Change texts, times, wifi or the style anytime; it updates instantly.") + btn(o.edit, "Edit my guide", "#1D2B24", "#fff") +
      p("Send access instructions (codes, keys) separately, as usual. Your guide is guaranteed online for at least 12 months.") + p("Happy hosting!"),
  },
  pt: {
    paid_s: (o) => `Pagamento recebido · Pedido ${o.order} · Preencha seu formulário`,
    paid: (o) => p("<b>Obrigado! Recebi seu pagamento.</b> O último passo é me contar sobre sua acomodação:") +
      bigBtn(o.edit, "Preencher o formulário →", "O botão não funciona? Copie este link no navegador:") +
      p("Leva uns 5 minutos: preencha alguns campos curtos ou simplesmente cole as mensagens de WhatsApp que você já envia aos hóspedes. Seu guia chega em menos de 24 horas.") +
      p(`<span style="color:#56625B;font-size:14px">Pedido: <b>${esc(o.order)}</b> · Valor: <b>${esc(o.amount)}</b></span>`) + p("Dúvidas? É só responder este e-mail."),
    ready_s: (o) => `Seu guia de ${o.name} está pronto`,
    ready: (o) => p("Seu guia já está online! Aqui estão seus dois links:") +
      p("<b>1. Link para seus hóspedes</b><br>Cole no Airbnb → Mensagens → Mensagens programadas, na sua mensagem de boas-vindas.") + btn(o.guide, "Ver meu guia") +
      p(`<a href="${o.guide}">${esc(o.guide)}</a>`) +
      p("<b>2. Link para editar (só para você, não compartilhe)</b><br>Mude textos, horários, wifi ou o estilo quando quiser; atualiza na hora.") + btn(o.edit, "Editar meu guia", "#1D2B24", "#fff") +
      p("Envie as instruções de acesso (códigos, chaves) separadamente, como sempre. Seu guia fica online garantido por pelo menos 12 meses.") + p("Boas reservas!"),
  },
  fr: {
    paid_s: (o) => `Paiement reçu · Commande ${o.order} · Remplissez votre formulaire`,
    paid: (o) => p("<b>Merci ! J'ai bien reçu votre paiement.</b> Dernière étape : parlez-moi de votre logement.") +
      bigBtn(o.edit, "Remplir le formulaire →", "Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :") +
      p("Cela prend environ 5 minutes : remplissez quelques champs courts ou collez simplement les messages WhatsApp que vous envoyez déjà à vos voyageurs. Votre guide arrive en moins de 24 heures.") +
      p(`<span style="color:#56625B;font-size:14px">Commande : <b>${esc(o.order)}</b> · Montant : <b>${esc(o.amount)}</b></span>`) + p("Une question ? Répondez simplement à cet e-mail."),
    ready_s: (o) => `Votre guide pour ${o.name} est prêt`,
    ready: (o) => p("Votre guide est en ligne ! Voici vos deux liens :") +
      p("<b>1. Lien pour vos voyageurs</b><br>Collez-le dans Airbnb → Messages → Messages programmés, dans votre message de bienvenue.") + btn(o.guide, "Voir mon guide") +
      p(`<a href="${o.guide}">${esc(o.guide)}</a>`) +
      p("<b>2. Lien pour modifier (pour vous seul, ne le partagez pas)</b><br>Changez les textes, horaires, wifi ou le style quand vous voulez ; c'est mis à jour immédiatement.") + btn(o.edit, "Modifier mon guide", "#1D2B24", "#fff") +
      p("Envoyez les instructions d'accès (codes, clés) à part, comme d'habitude. Votre guide est garanti en ligne au moins 12 mois.") + p("Bonnes réservations !"),
  },
  he: {
    paid_s: (o) => `התשלום התקבל · הזמנה ${o.order} · מלאו את הטופס`,
    paid: (o) => p("<b>תודה! התשלום התקבל.</b> נשאר שלב אחד: לספר לי על הנכס.") +
      bigBtn(o.edit, "למילוי הטופס ←", "הכפתור לא עובד? מעתיקים את הקישור הזה לדפדפן:") +
      p("לוקח בערך 5 דקות: ממלאים כמה שדות קצרים, או פשוט מדביקים את הודעות הוואטסאפ שאתם כבר שולחים לאורחים. המדריך מגיע תוך פחות מ־24 שעות.") +
      p(`<span style="color:#56625B;font-size:14px">הזמנה: <b>${esc(o.order)}</b> · סכום: <b>${esc(o.amount)}</b></span>`) + p("שאלות? פשוט עונים למייל."),
    ready_s: (o) => `המדריך של ${o.name} מוכן`,
    ready: (o) => p("המדריך שלך באוויר! הנה שני הקישורים שלך:") +
      p("<b>1. קישור לאורחים</b><br>מדביקים באיירביאנבי ← הודעות ← הודעות מתוזמנות, בהודעת הפתיחה.") + btn(o.guide, "לצפייה במדריך") +
      p(`<a href="${o.guide}">${esc(o.guide)}</a>`) +
      p("<b>2. קישור לעריכה (רק לך, לא לשתף)</b><br>משנים טקסטים, שעות, וויי־פיי או סגנון מתי שרוצים; המדריך מתעדכן מיד.") + btn(o.edit, "לעריכת המדריך", "#1D2B24", "#fff") +
      p("את הוראות הכניסה (קודים, מפתחות) שולחים בנפרד, כרגיל. המדריך באוויר באחריות לפחות 12 חודשים.") + p("בהצלחה!"),
  },
};
const t = (lang) => T[lang] || T.en;

export const mailPaid = (lang, to, o) => send({ to, subject: t(lang).paid_s(o), html: layout(lang, t(lang).paid(o)), replyTo: cfg.adminEmail });
export const mailReady = (lang, to, o) => send({ to, subject: t(lang).ready_s(o), html: layout(lang, t(lang).ready(o)), replyTo: cfg.adminEmail });

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
