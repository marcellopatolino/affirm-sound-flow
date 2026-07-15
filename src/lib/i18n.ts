import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { translations } from "./translations";

let initialized = false;

export function initI18n() {
  if (initialized) return i18n;
  initialized = true;
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        pt: { translation: translations.pt },
        es: { translation: translations.es },
        en: { translation: translations.en },
      },
      fallbackLng: "pt",
      supportedLngs: ["pt", "es", "en"],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "voxaffirm_lang",
      },
    });
  return i18n;
}

export default i18n;