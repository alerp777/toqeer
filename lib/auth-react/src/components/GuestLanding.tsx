import { useEffect, useRef, useState } from "react";
import { useAuthTheme } from "../context/ThemeContext";

export interface GuestLandingStat {
  v: string;
  l: LocalisedString;
}

export interface GuestLandingFeature {
  icon: string;
  title: LocalisedString;
  desc: LocalisedString;
  color?: string;
}

type Lang = "en" | "ur" | "roman";

type LocalisedString = string | { en: string; ur: string; roman: string };

function resolve(s: LocalisedString, lang: Lang): string {
  if (typeof s === "string") return s;
  return s[lang];
}

export interface GuestLandingProps {
  role: "rider" | "vendor";
  logoSrc?: string;
  logoAlt?: string;
  appName?: string;
  heroTitle: LocalisedString;
  heroSubtitle?: LocalisedString;
  stats: GuestLandingStat[];
  features: GuestLandingFeature[];
  ctaLoginLabel: LocalisedString;
  ctaRegisterLabel: LocalisedString;
  onLogin: () => void;
  onRegister: () => void;
  defaultLanguage?: Lang;
}

const LANG_LABELS: Record<Lang, string> = { en: "EN", ur: "اردو", roman: "RM" };
const LANG_CYCLE: Lang[] = ["en", "ur", "roman"];

/* ── Animated stat number ───────────────────────────────────────────────── */

function parseLeadingNumber(v: string): { prefix: string; num: number; suffix: string } | null {
  const m = v.match(/^([₨$€£¥]?)(\d[\d,.]*)(.*)$/);
  if (!m) return null;
  const raw = m[2].replace(/,/g, "");
  const num = parseFloat(raw);
  if (Number.isNaN(num)) return null;
  return { prefix: m[1], num, suffix: m[3] };
}

function formatNum(n: number, original: string): string {
  if (original.includes(",")) {
    return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  if (original.includes(".")) {
    const decimals = (original.split(".")[1] ?? "").length;
    return n.toFixed(decimals);
  }
  return String(Math.round(n));
}

function AnimatedStat({ v, primaryColor }: { v: string; primaryColor: string }) {
  const parsed = parseLeadingNumber(v);
  const [display, setDisplay] = useState(parsed ? "0" : v);
  const rafRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!parsed || startedRef.current) return;
    startedRef.current = true;
    const duration = 1200;
    const start = performance.now();
    const target = parsed.num;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * target;
      setDisplay(formatNum(current, v));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!parsed) {
    return <span style={{ color: primaryColor }}>{v}</span>;
  }

  return (
    <span style={{ color: primaryColor }}>
      {parsed.prefix}
      {display}
      {parsed.suffix}
    </span>
  );
}

export function GuestLanding({
  logoSrc,
  logoAlt,
  appName,
  heroTitle,
  heroSubtitle,
  stats,
  features,
  ctaLoginLabel,
  ctaRegisterLabel,
  onLogin,
  onRegister,
  defaultLanguage = "en",
}: GuestLandingProps) {
  const theme = useAuthTheme();
  const [lang, setLang] = useState<Lang>(defaultLanguage);

  const isUrdu = lang === "ur";
  const dir = isUrdu ? "rtl" : "ltr";
  const urduFont = '"Noto Nastaliq Urdu", serif';
  const bodyFont = isUrdu ? urduFont : "Inter, system-ui, sans-serif";

  const heroTitleText = resolve(heroTitle, lang);
  const heroSubText = heroSubtitle ? resolve(heroSubtitle, lang) : undefined;
  const loginLabel = resolve(ctaLoginLabel, lang);
  const registerLabel = resolve(ctaRegisterLabel, lang);

  return (
    <div
      dir={dir}
      style={{
        minHeight: "100vh",
        background: theme.background,
        color: theme.text,
        fontFamily: bodyFont,
        overflowX: "hidden",
      }}
    >
      {/* Sticky Navbar */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: `${theme.surface}f2`,
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${theme.border}`,
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {logoSrc && (
            <img
              src={logoSrc}
              alt={logoAlt ?? appName ?? "Logo"}
              style={{ height: 40, objectFit: "contain" }}
            />
          )}
          {appName && !logoSrc && (
            <span style={{ fontWeight: 800, fontSize: 18, color: theme.primary }}>{appName}</span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={onLogin}
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              border: `1.5px solid ${theme.border}`,
              background: "transparent",
              color: theme.text,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {loginLabel}
          </button>
          <button
            onClick={onRegister}
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              border: "none",
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark})`,
              color: theme.onPrimary,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {registerLabel}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "80px 24px 60px",
          textAlign: "center",
        }}
      >
        {/* Language switcher */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginBottom: 32,
          }}
        >
          {LANG_CYCLE.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: `1.5px solid ${l === lang ? theme.primary : theme.border}`,
                background: l === lang ? `${theme.primary}18` : "transparent",
                color: l === lang ? theme.primary : theme.textMuted,
                fontSize: 13,
                fontWeight: l === lang ? 700 : 500,
                cursor: "pointer",
                fontFamily: l === "ur" ? urduFont : "inherit",
              }}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>

        <h1
          style={{
            fontSize: "clamp(32px, 6vw, 56px)",
            fontWeight: 900,
            lineHeight: 1.15,
            margin: "0 0 20px",
            color: theme.text,
            whiteSpace: "pre-line",
            fontFamily: bodyFont,
          }}
        >
          {heroTitleText}
        </h1>

        {heroSubText && (
          <p
            style={{
              fontSize: "clamp(15px, 2.5vw, 18px)",
              color: theme.textMuted,
              lineHeight: 1.7,
              margin: "0 0 40px",
              fontFamily: bodyFont,
            }}
          >
            {heroSubText}
          </p>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={onRegister}
            style={{
              padding: "14px 32px",
              borderRadius: 14,
              border: "none",
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark})`,
              color: theme.onPrimary,
              fontSize: 16,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: `0 8px 24px ${theme.primary}40`,
              fontFamily: "inherit",
            }}
          >
            {registerLabel}
          </button>
          <button
            onClick={onLogin}
            style={{
              padding: "14px 32px",
              borderRadius: 14,
              border: `2px solid ${theme.border}`,
              background: "transparent",
              color: theme.text,
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {loginLabel}
          </button>
        </div>
      </section>

      {/* Stats Strip */}
      {stats.length > 0 && (
        <section
          style={{
            background: theme.surface,
            borderTop: `1px solid ${theme.border}`,
            borderBottom: `1px solid ${theme.border}`,
            padding: "32px 24px",
          }}
        >
          <div
            style={{
              maxWidth: 760,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)`,
              gap: 16,
              textAlign: "center",
            }}
          >
            {stats.map((s, i) => (
              <div key={i}>
                <div
                  style={{
                    fontSize: "clamp(22px, 4vw, 32px)",
                    fontWeight: 900,
                    lineHeight: 1.1,
                    marginBottom: 4,
                  }}
                >
                  <AnimatedStat v={s.v} primaryColor={theme.primary} />
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: theme.textMuted,
                    fontFamily: bodyFont,
                  }}
                >
                  {resolve(s.l, lang)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Features Section */}
      {features.length > 0 && (
        <section style={{ padding: "64px 24px", maxWidth: 840, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 20,
            }}
          >
            {features.map((f, i) => (
              <div
                key={i}
                style={{
                  background: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 16,
                  padding: "24px 20px",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: f.color ? `${f.color}18` : `${theme.primary}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    marginBottom: 14,
                  }}
                >
                  {f.icon}
                </div>
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: theme.text,
                    margin: "0 0 6px",
                    fontFamily: bodyFont,
                  }}
                >
                  {resolve(f.title, lang)}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: theme.textMuted,
                    lineHeight: 1.6,
                    margin: 0,
                    fontFamily: bodyFont,
                  }}
                >
                  {resolve(f.desc, lang)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer CTA */}
      <section
        style={{
          background: `linear-gradient(135deg, ${theme.primary}18 0%, ${theme.primaryLight}60 100%)`,
          borderTop: `1px solid ${theme.border}`,
          padding: "48px 24px",
          textAlign: "center",
        }}
      >
        <button
          onClick={onRegister}
          style={{
            padding: "14px 40px",
            borderRadius: 14,
            border: "none",
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark})`,
            color: theme.onPrimary,
            fontSize: 16,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: `0 8px 24px ${theme.primary}40`,
            fontFamily: "inherit",
          }}
        >
          {registerLabel}
        </button>
      </section>
    </div>
  );
}
