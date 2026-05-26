import type { Language } from "@workspace/i18n";
import { LANGUAGE_OPTIONS, isRTL, preloadLocale } from "@workspace/i18n";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api";

const STORAGE_KEY = "ajkmart_rider_language";
const VALID_LANGS = new Set<string>(LANGUAGE_OPTIONS.map((o) => o.value));

const NOTO_LINK_ID = "noto-nastaliq-font";
const NOTO_HREF =
  "https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap";

function applyNotoFont(lang: Language): void {
  if (lang === "ur") {
    if (!document.getElementById(NOTO_LINK_ID)) {
      const link = document.createElement("link");
      link.id = NOTO_LINK_ID;
      link.rel = "stylesheet";
      link.href = NOTO_HREF;
      document.head.appendChild(link);
    }
  } else {
    document.getElementById(NOTO_LINK_ID)?.remove();
  }
}

function getStoredLanguage(): Language | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_LANGS.has(stored)) return stored as Language;
  } catch (err) {
    console.warn("[artifacts/rider-app/src/lib/useLanguage.ts]", err);
  } // eslint-disable-line no-console
  return null;
}

/* P3: Cache the last-applied direction so we don't double-write the `dir`
   attribute on the document during the initial sync (caused a brief LTR→RTL
   flicker in the original code where applyRTL ran twice in quick succession). */
let _lastAppliedDir: string | null = null;
function applyRTL(lang: Language) {
  const dir = isRTL(lang) ? "rtl" : "ltr";
  if (_lastAppliedDir === dir + "|" + lang) return;
  _lastAppliedDir = dir + "|" + lang;
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lang === "ur" ? "ur" : "en");
  applyNotoFont(lang);
}

interface LanguageCtx {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  loading: boolean;
  initialised: boolean;
}

const LanguageContext = createContext<LanguageCtx>({
  language: "en",
  setLanguage: async () => {},
  loading: false,
  initialised: false,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [loading, setLoading] = useState(false);
  const [initialised, setInitialised] = useState(false);

  /* P3: Track whether the user has explicitly picked a language locally so we
     never silently overwrite that choice from the server. The server-side
     `language` is treated as a default for first-run only; once the rider has
     made a deliberate pick (either via setLanguage or by a previous local
     storage entry), we leave it alone. */
  const localPickRef = useRef<boolean>(getStoredLanguage() != null);

  useEffect(() => {
    const local = getStoredLanguage();
    if (local) {
      setLanguageState(local);
      applyRTL(local);
      preloadLocale(local).catch(() => {});
      setInitialised(true);
      /* Only sync language preference from server when authenticated — avoids
         a 401 on the login page which would log noise in the browser console. */
      if (api.getToken()) {
        api.getSettings().catch((err) => {
          console.warn("[artifacts/rider-app/src/lib/useLanguage.ts]", err);
        }); // eslint-disable-line no-console
      }
    } else {
      /* Only fetch from server when a token exists — avoids a 401 on the login
         page which would trigger an unintended logout cycle in apiFetch. */
      if (!api.getToken()) {
        setInitialised(true);
        return;
      }
      api
        .getSettings()
        .then((data: { language?: string }) => {
          /* If the user has set a language between fetch start and resolution,
             skip the server overwrite. */
          if (localPickRef.current) return;
          const serverLang = data?.language;
          if (serverLang && VALID_LANGS.has(serverLang)) {
            setLanguageState(serverLang as Language);
            applyRTL(serverLang as Language);
            preloadLocale(serverLang as Language).catch(() => {});
            try {
              localStorage.setItem(STORAGE_KEY, serverLang);
            } catch (err) {
              console.warn("[artifacts/rider-app/src/lib/useLanguage.ts]", err);
            } // eslint-disable-line no-console
          }
        })
        .catch((err) => {
          console.warn("[artifacts/rider-app/src/lib/useLanguage.ts]", err);
        }) // eslint-disable-line no-console
        .finally(() => setInitialised(true));
    }
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLoading(true);
    await preloadLocale(lang).catch(() => {});
    setLanguageState(lang);
    applyRTL(lang);
    /* P3: Mark that the user has made an explicit pick so any in-flight
       getSettings() resolution from the init effect does not overwrite it. */
    localPickRef.current = true;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (err) {
      console.warn("[artifacts/rider-app/src/lib/useLanguage.ts]", err);
    } // eslint-disable-line no-console
    try {
      await api.updateSettings({ language: lang });
    } catch (err) {
      console.warn("[artifacts/rider-app/src/lib/useLanguage.ts]", err);
    } // eslint-disable-line no-console
    setLoading(false);
  }, []);

  return React.createElement(
    LanguageContext.Provider,
    { value: { language, setLanguage, loading, initialised } },
    children
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
