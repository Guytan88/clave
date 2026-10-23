// Languages a guide can be published in (shared by the form, the guide page and the server).
export const LANGS = [
  { code: "es", name: "Español", en: "Spanish" },
  { code: "en", name: "English", en: "English" },
  { code: "pt", name: "Português", en: "Portuguese" },
  { code: "fr", name: "Français", en: "French" },
  { code: "de", name: "Deutsch", en: "German" },
  { code: "it", name: "Italiano", en: "Italian" },
  { code: "nl", name: "Nederlands", en: "Dutch" },
  { code: "pl", name: "Polski", en: "Polish" },
  { code: "ru", name: "Русский", en: "Russian" },
  { code: "uk", name: "Українська", en: "Ukrainian" },
  { code: "tr", name: "Türkçe", en: "Turkish" },
  { code: "ar", name: "العربية", en: "Arabic", rtl: true },
  { code: "he", name: "עברית", en: "Hebrew", rtl: true },
  { code: "hi", name: "हिन्दी", en: "Hindi" },
  { code: "zh", name: "中文", en: "Chinese (Simplified)" },
  { code: "ja", name: "日本語", en: "Japanese" },
  { code: "ko", name: "한국어", en: "Korean" },
  { code: "id", name: "Bahasa Indonesia", en: "Indonesian" },
  { code: "vi", name: "Tiếng Việt", en: "Vietnamese" },
  { code: "th", name: "ไทย", en: "Thai" },
];
export const LANG = Object.fromEntries(LANGS.map((l) => [l.code, l]));
export const THEMES = ["colonial", "playa", "ciudad", "cabana", "villa", "campo", "lago", "familiar"];
