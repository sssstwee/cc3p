import { readFileSync } from "node:fs";
import { equal } from "node:assert/strict";

const appTsx = readFileSync(new URL("./App.tsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const privateCore = readFileSync(
  new URL("../.private/agent-switch-private-core/src-tauri-core/src/lib.rs", import.meta.url),
  "utf8",
).replace(/\r\n/g, "\n");

equal(
  appTsx.includes("const licenseAccessAllowed = licenseControlsEnabled ? (licenseStatus?.access_allowed ?? false) : true;"),
  true,
);
equal(appTsx.includes("access_allowed: true,\n        license_state: \"trial\",\n        verification_status: \"offline\""), false);
equal(appTsx.includes("access_allowed: false,\n        license_state: \"invalid\",\n        verification_status: \"offline\""), true);
equal(privateCore.includes("record.activation_id.is_empty() && record.trial_verified_at.is_none()"), true);
equal(privateCore.includes("Ok(status_from_license_record(&record, now_millis()))"), true);
