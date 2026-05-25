import { GuestLanding as SharedGuestLanding } from "@workspace/auth-react";
import { AjkmartLogo } from "@workspace/ui/components/AjkmartLogo";
import { useLocation } from "wouter";

export function GuestLanding() {
  const [, navigate] = useLocation();
  return (
    <div style={{ position: "relative" }}>
      <div style={{
        position: "absolute",
        top: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        pointerEvents: "none",
      }}>
        <AjkmartLogo variant="full" size={180} theme="light" />
      </div>
      <SharedGuestLanding
        role="vendor"
        logoSrc=""
        logoAlt="AJKMart"
        appName="AJKMart Vendor"
        heroTitle={{ en: "Grow Your Business with AJKMart", ur: "اپنا کاروبار بڑھائیں", roman: "Apna karobar barhayein" }}
        heroSubtitle={{ en: "Sell Smart. Grow Fast.", ur: "سمارٹ بیچیں۔ تیزی سے بڑھیں۔", roman: "Smart Bechayn. Tezi Se Barhayn." }}
        stats={[
          { v: "4,200+", l: { en: "Active vendors", ur: "فعال وینڈرز", roman: "Active vendors" } },
          { v: "18", l: { en: "Cities", ur: "شہر", roman: "Shehar" } },
          { v: "2.1M+", l: { en: "Orders processed", ur: "آرڈرز", roman: "Orders process hue" } },
          { v: "4.7★", l: { en: "Vendor rating", ur: "وینڈر ریٹنگ", roman: "Vendor rating" } },
        ]}
        features={[
          {
            icon: "📊",
            title: { en: "Order Dashboard", ur: "آرڈر ڈیش بورڈ", roman: "Order Dashboard" },
            desc: { en: "Accept, manage, and track every order in real time with push alerts.", ur: "ہر آرڈر کو حقیقی وقت میں ٹریک کریں۔", roman: "Har order real time mein track karein." },
            color: "#1A56DB",
          },
          {
            icon: "📈",
            title: { en: "Sales Analytics", ur: "سیلز اینالیٹکس", roman: "Sales Analytics" },
            desc: { en: "Revenue charts, top products, and daily summaries at your fingertips.", ur: "آمدنی چارٹس اور یومیہ خلاصہ۔", roman: "Amdani charts aur yaumia khulasa." },
            color: "#F97316",
          },
          {
            icon: "📦",
            title: { en: "Inventory Management", ur: "انوینٹری", roman: "Inventory" },
            desc: { en: "Upload items, set prices, manage stock, and run promotions.", ur: "اشیاء اپلوڈ کریں اور اسٹاک منیج کریں۔", roman: "Ashiya upload karein, stock manage karein." },
            color: "#10B981",
          },
          {
            icon: "💳",
            title: { en: "Instant Payouts", ur: "فوری ادائیگی", roman: "Fori Adaigi" },
            desc: { en: "Earnings go to your digital wallet automatically. Withdraw anytime.", ur: "آمدنی والیٹ میں خودبخود آتی ہے۔", roman: "Amdani wallet mein khud-ba-khud aati hai." },
            color: "#8B5CF6",
          },
        ]}
        ctaLoginLabel={{ en: "Login", ur: "لاگ ان", roman: "Login Karein" }}
        ctaRegisterLabel={{ en: "Open Your Shop", ur: "دکان کھولیں", roman: "Dukaan Kholyein" }}
        onLogin={() => navigate("/login")}
        onRegister={() => navigate("/register")}
      />
    </div>
  );
}

export default GuestLanding;
