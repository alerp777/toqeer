import { useAppStatus as _useAppStatus } from "@workspace/auth-react";
import type { AppStatus } from "@workspace/auth-react";
import { api } from "../api";
import { usePlatformConfig } from "../useConfig";

export type { AppStatus } from "@workspace/auth-react";

export interface UserStatus {
  status: string;
  rejectionReason?: string | null;
}

export function useAppStatus(): AppStatus {
  const { config, isLoading } = usePlatformConfig();
  return _useAppStatus({
    platformConfig: {
      appStatus: config.platform.appStatus,
      supportPhone: config.platform.supportPhone,
      supportEmail: config.platform.supportEmail,
      maintenanceMessage: config.content.maintenanceMsg,
    },
    platformConfigLoading: isLoading,
    getMe: () =>
      api.getMe() as Promise<{
        approvalStatus?: string;
        rejectionReason?: string | null;
      }>,
  });
}
