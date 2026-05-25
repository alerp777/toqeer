import { useEffect, useState } from "react";
import { useLocation } from "wouter";

type Lang = "en" | "ur" | "roman";
const LANG_CYCLE: Lang[] = ["en", "ur", "roman"];
const LANG_LABELS: Record<Lang, string> = { en: "EN", ur: "اردو", roman: "RM" };

function readLang(): Lang {
  try {
    const v = localStorage.getItem("ajkmart_join_lang");
    if (v === "en" || v === "ur" || v === "roman") return v;
  } catch {}
  return "en";
}

const COPY = {
  en: {
    tagline: "Choose how you'd like to join",
    already: "Already have an account?",
    riderTitle: "Register as Rider",
    riderSub: "Deliver food, parcels & rides across AJK. Earn on your own schedule.",
    riderPerks: ["Instant payouts to wallet", "Flexible hours — no shifts", "GPS-guided navigation", "Bonus rewards & boosts"],
    riderCta: "Join as Rider",
    riderLogin: "Login as Rider",
    vendorTitle: "Register as Vendor",
    vendorSub: "Open your digital store. Sell groceries, food, pharmacy & more.",
    vendorPerks: ["Real-time order dashboard", "Sales analytics & reports", "Promotional tools", "Instant wallet settlements"],
    vendorCta: "Open Your Store",
    vendorLogin: "Login as Vendor",
  },
  ur: {
    tagline: "آپ کس طرح شامل ہونا چاہتے ہیں؟",
    already: "پہلے سے اکاؤنٹ ہے؟",
    riderTitle: "رائیڈر بنیں",
    riderSub: "اے جے کے میں کھانا، پارسل اور سواری پہنچائیں۔ اپنے وقت پر کمائیں۔",
    riderPerks: ["فوری والیٹ ادائیگی", "لچکدار اوقات", "GPS نیویگیشن", "بونس انعامات"],
    riderCta: "رائیڈر بنیں",
    riderLogin: "رائیڈر لاگ ان",
    vendorTitle: "وینڈر بنیں",
    vendorSub: "اپنی ڈیجیٹل دکان کھولیں۔ گروسری، کھانا، فارمیسی اور مزید بیچیں۔",
    vendorPerks: ["آرڈر ڈیش بورڈ", "سیلز اینالیٹکس", "پروموشنل ٹولز", "فوری ادائیگی"],
    vendorCta: "دکان کھولیں",
    vendorLogin: "وینڈر لاگ ان",
  },
  roman: {
    tagline: "Aap kaise shamil hona chahte hain?",
    already: "Pehle se account hai?",
    riderTitle: "Rider Banein",
    riderSub: "AJK mein khana, parcel aur sawari pohonchaein. Apne waqt par kamayein.",
    riderPerks: ["Fori wallet payment", "Lachakdar auqaat", "GPS navigation", "Bonus rewards"],
    riderCta: "Rider Banein",
    riderLogin: "Rider Login",
    vendorTitle: "Vendor Banein",
    vendorSub: "Apni digital dukaan kholyein. Grocery, khana, pharmacy aur mazeed bechaein.",
    vendorPerks: ["Order dashboard", "Sales analytics", "Promotional tools", "Fori payment"],
    vendorCta: "Dukaan Kholyein",
    vendorLogin: "Vendor Login",
  },
};

const GOLD = "#F0B90B";
const GOLD_DIM = "#D4A009";
const BLUE = "#1A56DB";
const BLUE_DIM = "#1348B5";
const BG = "#0b0e11";
const CARD = "#131720";
const BORDER = "#1e2530";

export default function JoinSelect() {
  const [, navigate] = useLocation();
  const [lang, setLang] = useState<Lang>(readLang);
  const [riderHover, setRiderHover] = useState(false);
  const [vendorHover, setVendorHover] = useState(false);

  const isRTL = lang === "ur";
  const C = COPY[lang];

  useEffect(() => {
    const prev = document.title;
    document.title = "Join AJKMart";
    document.documentElement.setAttribute("dir", isRTL ? "rtl" : "ltr");
    try { localStorage.setItem("ajkmart_join_lang", lang); } catch {}
    return () => {
      document.title = prev;
      document.documentElement.removeAttribute("dir");
    };
  }, [lang, isRTL]);

  function nextLang() {
    const idx = LANG_CYCLE.indexOf(lang);
    setLang(LANG_CYCLE[(idx + 1) % LANG_CYCLE.length]);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        color: "#E8E9EF",
        fontFamily: "Inter, system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflowX: "hidden",
      }}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "flex-end",
          padding: "16px 24px",
        }}
      >
        <button
          onClick={nextLang}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 99,
            border: `1px solid ${BORDER}`,
            background: CARD,
            color: "#9CA3AF",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          {LANG_LABELS[lang]}
        </button>
      </div>

      {/* ── Logo & Heading ── */}
      <div style={{ textAlign: "center", padding: "32px 24px 48px", maxWidth: 560 }}>
        {/* AJKMart Logo */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 22,
            background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DIM} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            boxShadow: `0 0 32px rgba(240,185,11,0.35), 0 8px 24px rgba(0,0,0,0.5)`,
          }}
        >
          <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
            {/* Shopping bag */}
            <path d="M9 14h24l-3 18H12L9 14z" fill="#0b0e11" fillOpacity="0.85" />
            <path d="M16 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="#0b0e11" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* AJK text */}
            <text x="21" y="27" textAnchor="middle" fontSize="9" fontWeight="800" fill="#0b0e11" fontFamily="Inter,sans-serif">AJK</text>
          </svg>
        </div>

        <h1
          style={{
            fontSize: "clamp(1.6rem, 5vw, 2.25rem)",
            fontWeight: 900,
            color: "#ffffff",
            margin: "0 0 8px",
            letterSpacing: "-0.02em",
          }}
        >
          AJKMart
        </h1>
        <p style={{ fontSize: 15, color: "#6B7280", margin: 0, fontWeight: 500 }}>
          {C.tagline}
        </p>
      </div>

      {/* ── Role Cards ── */}
      <div
        style={{
          display: "flex",
          gap: 16,
          padding: "0 20px 16px",
          width: "100%",
          maxWidth: 780,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {/* ── Rider Card ── */}
        <div
          onMouseEnter={() => setRiderHover(true)}
          onMouseLeave={() => setRiderHover(false)}
          style={{
            flex: "1 1 320px",
            maxWidth: 370,
            background: CARD,
            border: `1.5px solid ${riderHover ? GOLD : BORDER}`,
            borderRadius: 22,
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 0,
            transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
            transform: riderHover ? "translateY(-3px)" : "translateY(0)",
            boxShadow: riderHover
              ? `0 12px 40px rgba(240,185,11,0.18), 0 4px 16px rgba(0,0,0,0.4)`
              : "0 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: `rgba(240,185,11,0.12)`,
              border: `1px solid rgba(240,185,11,0.25)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="5.5" cy="17.5" r="2.5" />
              <circle cx="18.5" cy="17.5" r="2.5" />
              <path d="M8 17.5h7M3 9l1.5-5h7L14 9M14 9h4l2 5M8 9H3" />
            </svg>
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#ffffff", margin: "0 0 8px" }}>
            {C.riderTitle}
          </h2>
          <p style={{ fontSize: 13.5, color: "#6B7280", lineHeight: 1.65, margin: "0 0 20px" }}>
            {C.riderSub}
          </p>

          {/* Perks */}
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 9 }}>
            {C.riderPerks.map((perk) => (
              <li key={perk} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#9CA3AF" }}>
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 6,
                    background: `rgba(240,185,11,0.15)`,
                    border: `1px solid rgba(240,185,11,0.3)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {perk}
              </li>
            ))}
          </ul>

          {/* Primary CTA */}
          <button
            onClick={() => navigate("/register")}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              border: "none",
              background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DIM})`,
              color: "#0b0e11",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
              marginBottom: 10,
              boxShadow: `0 4px 16px rgba(240,185,11,0.30)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {C.riderCta}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={isRTL ? "M19 12H5M12 5l-7 7 7 7" : "M5 12h14M12 5l7 7-7 7"} />
            </svg>
          </button>

          {/* Login link */}
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: 12.5, color: "#4B5563" }}>{C.already} </span>
            <button
              onClick={() => navigate("/login")}
              style={{
                background: "none",
                border: "none",
                color: GOLD,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
              }}
            >
              {C.riderLogin}
            </button>
          </div>
        </div>

        {/* ── Vendor Card ── */}
        <div
          onMouseEnter={() => setVendorHover(true)}
          onMouseLeave={() => setVendorHover(false)}
          style={{
            flex: "1 1 320px",
            maxWidth: 370,
            background: CARD,
            border: `1.5px solid ${vendorHover ? BLUE : BORDER}`,
            borderRadius: 22,
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 0,
            transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
            transform: vendorHover ? "translateY(-3px)" : "translateY(0)",
            boxShadow: vendorHover
              ? `0 12px 40px rgba(26,86,219,0.18), 0 4px 16px rgba(0,0,0,0.4)`
              : "0 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: `rgba(26,86,219,0.12)`,
              border: `1px solid rgba(26,86,219,0.28)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#ffffff", margin: "0 0 8px" }}>
            {C.vendorTitle}
          </h2>
          <p style={{ fontSize: 13.5, color: "#6B7280", lineHeight: 1.65, margin: "0 0 20px" }}>
            {C.vendorSub}
          </p>

          {/* Perks */}
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 9 }}>
            {C.vendorPerks.map((perk) => (
              <li key={perk} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#9CA3AF" }}>
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 6,
                    background: `rgba(26,86,219,0.15)`,
                    border: `1px solid rgba(26,86,219,0.30)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke={BLUE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {perk}
              </li>
            ))}
          </ul>

          {/* Primary CTA */}
          <button
            onClick={() => { window.location.href = "/vendor/register"; }}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              border: "none",
              background: `linear-gradient(135deg, ${BLUE}, ${BLUE_DIM})`,
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
              marginBottom: 10,
              boxShadow: `0 4px 16px rgba(26,86,219,0.30)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {C.vendorCta}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={isRTL ? "M19 12H5M12 5l-7 7 7 7" : "M5 12h14M12 5l7 7-7 7"} />
            </svg>
          </button>

          {/* Login link */}
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: 12.5, color: "#4B5563" }}>{C.already} </span>
            <button
              onClick={() => { window.location.href = "/vendor/login"; }}
              style={{
                background: "none",
                border: "none",
                color: "#60A5FA",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
              }}
            >
              {C.vendorLogin}
            </button>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{ marginTop: "auto", padding: "32px 24px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "#374151", margin: 0 }}>
          © 2026 AJKMart · Azad Jammu &amp; Kashmir
        </p>
      </footer>
    </div>
  );
}
