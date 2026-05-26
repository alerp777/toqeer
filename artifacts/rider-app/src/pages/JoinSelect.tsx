import { useLocation } from "wouter";
import { JoinSelect as SharedJoinSelect } from "@workspace/auth-react";

const RIDER_THEME = {
  bg: "#0b0e11",
  card: "#131720",
  border: "#1e2530",
  logoFill: "#0b0e11",
};

export default function JoinSelect() {
  const [, navigate] = useLocation();

  return (
    <SharedJoinSelect
      theme={RIDER_THEME}
      actions={{
        onRiderRegister: () => navigate("/register"),
        onRiderLogin: () => navigate("/login"),
        onVendorRegister: () => { window.location.href = "/vendor/register"; },
        onVendorLogin: () => { window.location.href = "/vendor/login"; },
      }}
    />
  );
}
