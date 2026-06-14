import {
  activationStatusText,
  licenseBrandBadgeText,
  maskActivationCode,
  normalizeActivationCode,
  validateActivationCode,
  type LicenseActivationStatus,
} from "./licenseActivation.ts";

function equal<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  }
}

const activeStatus: LicenseActivationStatus = {
  activated: true,
  access_allowed: true,
  code_suffix: "9XYZ",
  buyer_email: "buyer@example.com",
  activated_at: 1765584000000,
  activation_id: "local-1765584000000",
  trial_started_at: 1762992000000,
  trial_expires_at: 1765584000000,
  trial_days_remaining: 0,
  license_state: "activated",
  verification_status: "verified",
};

equal(normalizeActivationCode(" swp1-abcde fghjk-mnpqr-stuvw-xyz23-45678 "), "SWP1-ABCDEFGHJK-MNPQR-STUVW-XYZ23-45678");
equal(maskActivationCode("swp1-abcde-fghjk-mnpqr-stuvw-xyz23-45678"), "SWP1-...5678");
equal(maskActivationCode("short"), "SHORT");
equal(validateActivationCode("  "), "请输入授权码。");
equal(validateActivationCode("abc"), "授权码至少需要 8 个字符。");
equal(validateActivationCode("swp-1a2b-3c4d-9xyz"), "授权码格式不正确。");
equal(validateActivationCode("swp1-abcde-fghjk-mnpqr-stuvw-xyz23-45678"), "");
equal(validateActivationCode("switch-1a2b-3c4d"), "授权码格式不正确。");
equal(activationStatusText({ activated: false, access_allowed: true, trial_days_remaining: 7, license_state: "trial" }), "试用中 · 7 天");
equal(activationStatusText({ activated: false, access_allowed: false, trial_days_remaining: 0, license_state: "expired" }), "试用已结束");
equal(activationStatusText(activeStatus), "已激活 · **** 9XYZ");
equal(licenseBrandBadgeText(null), "试用");
equal(licenseBrandBadgeText({ activated: false, access_allowed: true, license_state: "trial" }), "试用");
equal(licenseBrandBadgeText({ activated: false, access_allowed: false, license_state: "expired" }), "试用已结束");
equal(licenseBrandBadgeText(activeStatus), null);
