import { useState } from "react";

export interface OnboardingProps {
  onDone: () => void;
}

const GOLD = "#F0B90B";
const BG = "#0b0e11";
const CARD = "#131720";
const BORDER = "#1e2530";

interface Slide {
  icon: string;
  titleEn: string;
  titleUr: string;
  titleRoman: string;
  descEn: string;
  descUr: string;
  descRoman: string;
  accentColor: string;
}

const SLIDES: Slide[] = [
  {
    icon: "💰",
    titleEn: "Earn More",
    titleUr: "زیادہ کمائیں",
    titleRoman: "Zyada Kamayein",
    descEn: "Accept rides and deliveries across AJK. Instant payouts hit your wallet the moment each job is done.",
    descUr: "اے جے کے میں سواری اور ڈیلیوری قبول کریں۔ ہر کام مکمل ہوتے ہی فوری ادائیگی والیٹ میں آ جاتی ہے۔",
    descRoman: "AJK mein sawari aur delivery qabool karein. Har kaam mukammal hotay hi fori adaigi wallet mein aa jati hai.",
    accentColor: GOLD,
  },
  {
    icon: "🗺️",
    titleEn: "Navigate Live",
    titleUr: "لائیو نیویگیشن",
    titleRoman: "Live Navigate Karein",
    descEn: "Built-in GPS routing keeps you on the fastest path in real time — even on slow data connections.",
    descUr: "بلٹ ان جی پی ایس آپ کو سب سے تیز راستے پر رکھتا ہے، یہاں تک کہ سست ڈیٹا پر بھی۔",
    descRoman: "Built-in GPS aapko teez tareen raste par rakhta hai, yahan tak ke slow data par bhi.",
    accentColor: "#00C48C",
  },
  {
    icon: "🚀",
    titleEn: "Get Paid Fast",
    titleUr: "تیز ادائیگی پائیں",
    titleRoman: "Tezi Se Paid Hon",
    descEn: "Hit milestones, unlock bonuses and fuel allowances. Your earnings are always yours — withdraw anytime.",
    descUr: "اہداف حاصل کریں، بونس اور فیول الاؤنس پائیں۔ آپ کی کمائی ہمیشہ آپ کی ہے — جب چاہیں نکالیں۔",
    descRoman: "Targets hasil karein, bonus aur fuel allowance payein. Aapki kamai hamesha aapki hai — jab chahen nikaalein.",
    accentColor: "#AF52DE",
  },
];

export default function Onboarding({ onDone }: OnboardingProps) {
  const [slide, setSlide] = useState(0);

  const current = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;

  function handleNext() {
    if (isLast) {
      onDone();
    } else {
      setSlide((s) => s + 1);
    }
  }

  function handleSkip() {
    onDone();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 99998,
        fontFamily: "Inter, system-ui, sans-serif",
        padding: "48px 24px 40px",
      }}
    >
      <style>{`
        @keyframes ajkSlideIn {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div style={{ width: "100%", display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSkip}
          style={{
            background: "none",
            border: `1px solid ${BORDER}`,
            color: "#6B7280",
            fontSize: 13,
            fontWeight: 600,
            padding: "6px 16px",
            borderRadius: 99,
            cursor: "pointer",
          }}
        >
          Skip
        </button>
      </div>

      <div
        key={slide}
        style={{
          animation: "ajkSlideIn 0.35s ease both",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 24,
          maxWidth: 360,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 36,
            background: CARD,
            border: `1.5px solid ${current.accentColor}33`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 56,
            boxShadow: `0 0 40px ${current.accentColor}22`,
          }}
        >
          {current.icon}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2
            style={{
              color: "#FFFFFF",
              fontSize: 28,
              fontWeight: 900,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            {current.titleEn}
          </h2>
          <p
            style={{
              color: current.accentColor,
              fontSize: 14,
              fontWeight: 700,
              margin: 0,
              fontFamily: "Noto Nastaliq Urdu, serif",
              direction: "rtl",
            }}
          >
            {current.titleUr}
          </p>
          <p style={{ color: "#6B7280", fontSize: 12, fontWeight: 500, margin: 0 }}>
            {current.titleRoman}
          </p>
        </div>

        <p style={{ color: "#9CA3AF", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
          {current.descEn}
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === slide ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === slide ? GOLD : BORDER,
                transition: "width 0.3s ease, background 0.3s ease",
              }}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 14,
            border: "none",
            background: `linear-gradient(135deg, ${GOLD}, #D4A009)`,
            color: "#0b0e11",
            fontSize: 15,
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: "0 4px 20px rgba(240,185,11,0.35)",
          }}
        >
          {isLast ? "Get Started" : "Next"}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
