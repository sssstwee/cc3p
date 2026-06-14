export type LicenseActivationStatus = {
  activated: boolean;
  access_allowed?: boolean;
  code_suffix?: string;
  activated_at?: number;
  activation_id?: string;
  buyer_email?: string;
  trial_started_at?: number;
  trial_expires_at?: number;
  trial_days_remaining?: number;
  license_state?: "trial" | "expired" | "activated" | "invalid";
  verification_status?: "unverified" | "verified" | "offline" | "invalid";
  last_verified_at?: number;
  message?: string;
};

export type LicenseActivationResult = LicenseActivationStatus & {
  message: string;
};

export function normalizeActivationCode(code: string) {
  return code.trim().replace(/\s+/g, "").toUpperCase();
}

export function validateActivationCode(code: string) {
  const normalized = normalizeActivationCode(code);
  if (!normalized) return "请输入授权码。";
  if (normalized.length < 8) return "授权码至少需要 8 个字符。";
  if (!/^[A-Z0-9_-]+$/.test(normalized)) {
    return "授权码只能包含字母、数字、短横线或下划线。";
  }
  const compact = normalized.replace(/-/g, "");
  const isSwp1Code = /^SWP1[A-HJ-NP-Z2-9]{30}$/.test(compact);
  if (!isSwp1Code) {
    return "授权码格式不正确。";
  }
  return "";
}

export function maskActivationCode(code: string) {
  const normalized = normalizeActivationCode(code);
  if (normalized.length <= 6) return normalized;
  const suffix = normalized.slice(-4);
  const prefix = normalized.includes("-") ? normalized.split("-")[0] : normalized.slice(0, 4);
  return `${prefix}-...${suffix}`;
}

export function activationStatusText(status: LicenseActivationStatus | null | undefined) {
  if (!status?.activated) {
    if (status?.license_state === "expired" || status?.access_allowed === false) {
      return "试用已结束";
    }
    if (typeof status?.trial_days_remaining === "number") {
      return `试用中 · ${status.trial_days_remaining} 天`;
    }
    return "未激活";
  }
  return `已激活 · **** ${status.code_suffix ?? "----"}`;
}

export function licenseBrandBadgeText(status: LicenseActivationStatus | null | undefined) {
  if (status?.activated) {
    return null;
  }
  if (status?.license_state === "expired" || status?.access_allowed === false) return "试用已结束";
  return "试用";
}
