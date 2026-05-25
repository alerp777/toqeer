import { GuestLanding as SharedGuestLanding } from "@workspace/auth-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../lib/rider-auth";

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
        { v: "₨ 2,400", l: "Avg daily earnings" },
        { v: "12,000+", l: "Active riders" },
        { v: "18", l: "Cities covered" },
        { v: "4.8★", l: "App rating" },
      ]}
      features={[
        { icon: "⚡", color: "#F0B90B", title: "Instant Payouts", desc: "Earnings hit your wallet the moment a delivery is complete — no weekly waits." },
        { icon: "🗺️", color: "#22C55E", title: "Live Navigation", desc: "Built-in GPS routing shows the fastest route in real time, even on slow data." },
        { icon: "🕐", color: "#3B82F6", title: "Flexible Hours", desc: "Go online when it suits you. No fixed shifts, no penalties for logging off." },
        { icon: "🎁", color: "#A855F7", title: "Bonus Rewards", desc: "Hit delivery milestones to unlock surge bonuses, weekend boosts, and fuel allowances." },
      ]}
      ctaLoginLabel={{ en: "Login", ur: "لاگ ان", roman: "Login Karein" }}
      ctaRegisterLabel={{ en: "Join as Rider", ur: "رائیڈر بنیں", roman: "Rider Banein" }}
      onLogin={() => navigate("/login")}
      onRegister={() => navigate("/register")}
    />
  );
}

export default GuestLanding;
