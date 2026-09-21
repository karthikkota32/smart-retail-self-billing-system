/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import en from "../locales/en.json";
import te from "../locales/te.json";
import hi from "../locales/hi.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "EN", name: "English", nativeName: "English" },
  { code: "te", label: "TE", name: "Telugu", nativeName: "తెలుగు" },
  { code: "hi", label: "HI", name: "Hindi", nativeName: "हिन्दी" }
];

const TRANSLATIONS = { en, te, hi };

const LanguageContext = createContext({
  language: "en",
  setLanguage: () => {},
  t: (key, fallback = "") => fallback || key,
  languages: SUPPORTED_LANGUAGES,
  isLoaded: true
});

/**
 * Traverses an object using dot notation path e.g. "nav.shop"
 */
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  const keys = path.split(".");
  let current = obj;
  for (const k of keys) {
    if (current && typeof current === "object" && k in current) {
      current = current[k];
    } else {
      return undefined;
    }
  }
  return current;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem("app_language");
      if (saved && ["en", "te", "hi"].includes(saved)) {
        return saved;
      }
    } catch {
      // Ignore localStorage errors
    }
    return "en";
  });

  // Keep html lang and body classes in sync with language
  useEffect(() => {
    try {
      document.documentElement.lang = language;
      document.body.classList.remove("lang-en", "lang-te", "lang-hi");
      document.body.classList.add(`lang-${language}`);
      localStorage.setItem("app_language", language);
    } catch {
      // Ignore DOM storage errors
    }
  }, [language]);

  const setLanguage = useCallback((lang) => {
    if (["en", "te", "hi"].includes(lang)) {
      setLanguageState(lang);
      try {
        localStorage.setItem("app_language", lang);
        window.dispatchEvent(new CustomEvent("languageChange", { detail: lang }));
      } catch {
        // Ignore
      }
    }
  }, []);

  const t = useCallback(
    (path, fallback = "") => {
      const currentDict = TRANSLATIONS[language];
      const val = getNestedValue(currentDict, path);
      if (typeof val === "string" && val.trim() !== "") {
        return val;
      }

      // Fallback to English
      const enVal = getNestedValue(TRANSLATIONS.en, path);
      if (typeof enVal === "string" && enVal.trim() !== "") {
        return enVal;
      }

      return fallback || path;
    },
    [language]
  );

  const contextValue = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      languages: SUPPORTED_LANGUAGES,
      currentLanguageMeta: SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0]
    }),
    [language, setLanguage, t]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
