import type { CSSProperties } from "react";
import { usePushNotifications } from "../hooks/usePushNotifications";

export function PushPermissionBanner() {
  const { permission, isSubscribed, isDismissed, requestPermission, dismiss } =
    usePushNotifications();

  if (permission === "unsupported") return null;
  if (permission === "granted" || isSubscribed) return null;
  if (permission === "denied" || isDismissed) return null;

  return (
    <div style={styles.wrapper}>
      <div style={styles.banner}>
        <div style={styles.left}>
          <div style={styles.iconBox}>
            <span style={{ fontSize: 20 }}>🔔</span>
          </div>
          <div>
            <div style={styles.title}>Enable Ride Alerts</div>
            <div style={styles.subtitle}>Get instant alerts for new ride requests</div>
          </div>
        </div>
        <div style={styles.actions}>
          <button style={styles.allowBtn} onClick={requestPermission}>
            Allow
          </button>
          <button style={styles.closeBtn} onClick={dismiss} aria-label="Dismiss">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9998,
    padding: "12px 16px",
    background: "linear-gradient(135deg, #0f1923 0%, #1a2535 100%)",
    borderTop: "1px solid rgba(240,185,11,0.25)",
    boxShadow: "0 -4px 20px rgba(0,0,0,0.4)",
  },
  banner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    maxWidth: 600,
    margin: "0 auto",
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "rgba(240,185,11,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 700,
    fontSize: 14,
    color: "#f9fafb",
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: "Inter, sans-serif",
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  allowBtn: {
    background: "#F0B90B",
    color: "#0b0e11",
    border: "none",
    borderRadius: 10,
    padding: "8px 18px",
    fontFamily: "Inter, sans-serif",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  closeBtn: {
    background: "transparent",
    color: "rgba(255,255,255,0.4)",
    border: "none",
    padding: "6px 8px",
    cursor: "pointer",
    fontSize: 14,
    fontFamily: "Inter, sans-serif",
  },
};
