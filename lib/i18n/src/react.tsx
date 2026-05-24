"use client";

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from "react";
import type { Language, TranslationKey } from "./index";
import { DEFAULT_LANGUAGE, LANGUAGE_OPTIONS, isRTL, t } from "./index";
import { createLogger } from "@workspace/logger";

const log = createLogger("[i18n-react]");

/**
 * TranslationContext — provides language state & translation function
 * to all child components via React Context.
 */
interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: TranslationKey) => string;
  loading: boolean;
  initialised: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

/**
 * useTranslation — hook to access translation context
 * Throws if used outside LanguageProvider
 */
export function useTranslation(): TranslationContextType {
  const ctx = useContext(TranslationContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within LanguageProvider");
  }
  return ctx;
}

/**
 * LanguageProvider — wraps app with translation context
 * Manages language state, localStorage, server sync (if api provided)
 */
export interface LanguageProviderProps {
  children: ReactNode;
  /**
   * Optional API for server-side language persistence.
   * If provided, language changes will sync to server.
   */
  api?: {
    getSettings: () => Promise<{ language?: string; [key: string]: unknown }>;
    updateSettings: (data: { language: string }) => Promise<void>;
    getToken: () => string | null;
  };
  /**
   * localStorage key prefix (default: "ajkmart")
   */
  lsKeyPrefix?: string;
}

export function LanguageProvider({
  children,
  api,
  lsKeyPrefix = "ajkmart",
}: LanguageProviderProps) {
  const lsKey = `${lsKeyPrefix}_language`;
  const [language, setLang] = useState<Language>(() => {
    // Initial: read from localStorage
    if (typeof window === "undefined") return DEFAULT_LANGUAGE;
    try {
      const stored = localStorage.getItem(lsKey);
      if (stored && isValidLanguage(stored)) {
        return stored as Language;
      }
    } catch (err) {
      log.warn("Failed to read language from localStorage", err);
    }
    return DEFAULT_LANGUAGE;
  });

  const [loading, setLoading] = useState(false);
  const [initialised, setInitialised] = useState(false);

  // Apply RTL & document attributes whenever language changes
  useEffect(() => {
    const dir = isRTL(language) ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", language === "ur" ? "ur" : "en");
    try {
      localStorage.setItem(lsKey, language);
    } catch (err) {
      log.warn("Failed to save language to localStorage", err);
    }
  }, [language, lsKey]);

  // On mount: fetch language from server if api available
  useEffect(() => {
    if (!api) {
      setInitialised(true);
      return;
    }

    // Only fetch if token exists (avoid 401 on login page)
    if (!api.getToken()) {
      setInitialised(true);
      return;
    }

    api
      .getSettings()
      .then((settings) => {
        if (settings?.language && isValidLanguage(settings.language)) {
          setLang(settings.language as Language);
        }
      })
      .catch((err) => {
        log.warn("Failed to fetch language from API", err);
      })
      .finally(() => setInitialised(true));
  }, [api]);

  const setLanguage = useCallback(
    async (lang: Language) => {
      setLoading(true);
      setLang(lang);

      // Sync to server if api available
      if (api) {
        try {
          await api.updateSettings({ language: lang });
        } catch (err) {
          log.warn("Failed to update language on API", err);
        }
      }

      setLoading(false);
    },
    [api]
  );

  const translate = useCallback((key: TranslationKey): string => t(key, language), [language]);

  const value: TranslationContextType = {
    language,
    setLanguage,
    t: translate,
    loading,
    initialised,
  };

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

/**
 * Type guard to validate language strings
 */
function isValidLanguage(value: unknown): boolean {
  return LANGUAGE_OPTIONS.some((option) => option.value === value);
}
