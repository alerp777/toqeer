import { GuestLanding as SharedGuestLanding } from "@workspace/auth-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../lib/rider-auth";
import { riderTheme } from "../lib/auth/theme";

/* Feature accent colours — spec-specified, named to avoid inline hex literals */
const CLR_GREEN = "#22C55E";
const CLR_BLUE = "#3B82F6";
const CLR_PURPLE = "#A855F7";

export function GuestLanding() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  return (
    <SharedGuestLanding
      role="rider"
      logoSrc="/ajkmart-logo.png"
      appName="AJKMart Rider"
      heroTitle={{ en: "Earn More. Ride Free.", ur: "زیادہ کمائیں۔ آزاد سفر کریں۔", roman: "Zyada Kamayen. Azad Safar karen." }}
      heroSubtitle={{ en: "Join thousands of riders across AJK and earn whenever you want.", ur: "ہزاروں رائیڈرز کے ساتھ شامل ہوں اور جب چاہیں کمائیں۔", roman: "Hazaron riders ke sath shamil hon aur jab chahen kamayein." }}
      stats={[
        { v: "₨ 2,400", l: { en: "Avg daily earnings", ur: "اوسط یومیہ آمدن", roman: "Avg roz ki kamai" } },
        { v: "12,000+", l: { en: "Active riders", ur: "فعال رائیڈرز", roman: "Active riders" } },
        { v: "18", l: { en: "Cities covered", ur: "شہر", roman: "Shehar" } },
        { v: "4.8★", l: { en: "App rating", ur: "ایپ ریٹنگ", roman: "App rating" } },
      ]}
      features={[
        {
          icon: "⚡", color: riderTheme.primary,
          title: { en: "Instant Payouts", ur: "فوری ادائیگی", roman: "Fori Adaygi" },
          desc: { en: "Earnings hit your wallet the moment a delivery is complete — no weekly waits.", ur: "جیسے ہی ڈیلیوری مکمل ہو، کمائی فوراً والیٹ میں آ جاتی ہے۔", roman: "Delivery mukammal hotay hi kamai foran wallet mein aa jati hai." },
        },
        {
          icon: "🗺️", color: CLR_GREEN,
          title: { en: "Live Navigation", ur: "لائیو نیویگیشن", roman: "Live Navigation" },
          desc: { en: "Built-in GPS routing shows the fastest route in real time, even on slow data.", ur: "بلٹ ان جی پی ایس سست ڈیٹا پر بھی سب سے تیز راستہ دکھاتا ہے۔", roman: "Built-in GPS slow data par bhi tez tareen rasta dikhata hai." },
        },
        {
          icon: "🕐", color: CLR_BLUE,
          title: { en: "Flexible Hours", ur: "لچکدار اوقات", roman: "Lachakdar Auqat" },
          desc: { en: "Go online when it suits you. No fixed shifts, no penalties for logging off.", ur: "جب چاہیں آن لائن جائیں، کوئی فکسڈ شفٹ نہیں، کوئی جرمانہ نہیں۔", roman: "Jab chahen online jayen, koi fixed shift nahi, koi jurmana nahi." },
        },
        {
          icon: "🎁", color: CLR_PURPLE,
          title: { en: "Bonus Rewards", ur: "بونس انعامات", roman: "Bonus Inaam" },
          desc: { en: "Hit delivery milestones to unlock surge bonuses, weekend boosts, and fuel allowances.", ur: "ڈیلیوری اہداف پورے کریں اور سرج بونس، ویکنڈ بوسٹ اور فیول الاؤنس پائیں۔", roman: "Delivery targets pore karen aur surge bonus, weekend boost aur fuel allowance payen." },
        },
      ]}
      ctaLoginLabel={{ en: "Login", ur: "لاگ ان", roman: "Login Karein" }}
      ctaRegisterLabel={{ en: "Join as Rider", ur: "رائیڈر بنیں", roman: "Rider Banein" }}
      onLogin={() => navigate("/login")}
      onRegister={() => navigate("/register")}
    />
  );
}

export default GuestLanding;
