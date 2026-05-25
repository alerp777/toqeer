import { useEffect, useRef, useState } from "react";
import { registerPush } from "../lib/push";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

export interface PushNotificationState {
  permission: PermissionState;
  isSubscribed: boolean;
  isDismissed: boolean;
  requestPermission: () => Promise<void>;
  dismiss: () => void;
}

const DISMISSED_KEY = "vendor_push_banner_dismissed";
const SUBSCRIBED_KEY = "vendor_push_subscribed";

export function usePushNotifications(): PushNotificationState {
  const [permission, setPermission] = useState<PermissionState>(() => {
    if (typeof Notification === "undefined") return "unsupported";
    if (!("PushManager" in window)) return "unsupported";
    return (Notification.permission as PermissionState) ?? "default";
  });

  const [isSubscribed, setIsSubscribed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SUBSCRIBED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const registerAttempted = useRef(false);

  useEffect(() => {
    if (typeof Notification === "undefined" || !("PushManager" in window)) return;
    if (Notification.permission === "granted" && !registerAttempted.current) {
      registerAttempted.current = true;
      registerPush().then(() => {
        setIsSubscribed(true);
        try {
          localStorage.setItem(SUBSCRIBED_KEY, "1");
        } catch { /* ignore */ }
      }).catch(() => { /* silently ignore */ });
    }
  }, []);

  const requestPermission = async (): Promise<void> => {
    if (typeof Notification === "undefined" || !("PushManager" in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      if (result === "granted") {
        registerAttempted.current = true;
        await registerPush();
        setIsSubscribed(true);
        try {
          localStorage.setItem(SUBSCRIBED_KEY, "1");
        } catch { /* ignore */ }
      } else if (result === "denied") {
        setIsDismissed(true);
        try {
          localStorage.setItem(DISMISSED_KEY, "1");
        } catch { /* ignore */ }
      }
    } catch {
      /* ignore */
    }
  };

  const dismiss = (): void => {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch { /* ignore */ }
  };

  return { permission, isSubscribed, isDismissed, requestPermission, dismiss };
}
