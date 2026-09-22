import type { Lang } from "./types";
import enJson from "./i18n/en.json";
import arJson from "./i18n/ar.json";
import ruJson from "./i18n/ru.json";
import zhJson from "./i18n/zh.json";

export type I18nDict = { [K in keyof typeof enJson]: string };

const ar = (arJson as unknown) as I18nDict;
const ru = (ruJson as unknown) as I18nDict;
const zh = (zhJson as unknown) as I18nDict;

export const en = (enJson as unknown) as I18nDict;

export const LANGS = { en, ar, ru, zh } as const;

export const LANG_NAMES: Record<Lang, string> = {
  en: "English",
  ar: "العربية",
  ru: "Русский",
  zh: "中文",
};

export function i18nDict(lang: Lang): I18nDict {
  // English is the base — missing keys in any language fall back to English.
  return { ...en, ...LANGS[lang] };
}

export function fmt(tpl: string, params: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) =>
    k in params ? String(params[k]) : `{${k}}`
  );
}