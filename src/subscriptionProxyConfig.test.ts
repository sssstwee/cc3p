import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { SubscriptionProxyStatus } from "./appTypes.ts";
import { isSubscriptionProxyBaseUrl } from "./gatewayProfile.ts";
import {
  buildClaudeCodeConnectionSummary,
  buildCursorConnectionSummary,
  buildSubscriptionProxyProfile,
  isSubscriptionProxyProfileId,
  selectSubscriptionProxyModel,
  SUBSCRIPTION_PROXY_CLAUDE_DESKTOP_PROFILE_ID,
  SUBSCRIPTION_PROXY_PROFILE_ID,
  subscriptionProxyProfileIdForTarget,
  subscriptionProxyUsableModels,
  syncSubscriptionProxyProfiles,
} from "./subscriptionProxyConfig.ts";

const clientConfig = {
  apiKey: "sk-switchpp-local",
  baseUrl: "http://127.0.0.1:8317",
  model: "gpt-5.4",
};

const runningStatus: SubscriptionProxyStatus = {
  installed: true,
  running: true,
  managed_by_app: true,
  binary_path: "/tmp/cliproxyapi",
  version: "7.2.102",
  base_url: clientConfig.baseUrl,
  client_api_key: clientConfig.apiKey,
  config_path: "/tmp/config.yaml",
  auth_dir: "/tmp/auth",
  codex_authenticated: true,
  codex_account_count: 1,
  gateway_running: true,
  gateway_base_url: "http://127.0.0.1:23457/subscription/v1",
  gateway_api_key: "agent-switch-local-gateway",
  models: [
    "codex-auto-review",
    "Fable5",
    "gpt-image-2",
    "gpt-5.4",
    "gpt-5.6-sol",
  ],
};

test("Claude Code summary keeps the Anthropic-compatible base URL explicit", () => {
  assert.equal(
    buildClaudeCodeConnectionSummary(clientConfig),
    [
      "Base URL: http://127.0.0.1:8317",
      "API Key: sk-switchpp-local",
      "Model: gpt-5.4",
    ].join("\n"),
  );
});

test("subscription proxy creates a stable gateway-routed Claude Code profile", () => {
  const profile = buildSubscriptionProxyProfile(
    clientConfig,
    "claude_cli",
    undefined,
    123,
  );

  assert.equal(profile.id, SUBSCRIPTION_PROXY_PROFILE_ID);
  assert.equal(profile.display_name, "ChatGPT 订阅");
  assert.equal(profile.base_url, "http://127.0.0.1:8317");
  assert.equal(profile.api_key, "sk-switchpp-local");
  assert.equal(profile.api_format, "anthropic");
  assert.equal(profile.auth_field, "ANTHROPIC_AUTH_TOKEN");
  assert.equal(profile.compat_mode, "proxy");
  assert.deepEqual(profile.model_map, {
    main: "gpt-5.4",
    haiku: "gpt-5.4",
    sonnet: "gpt-5.4",
    opus: "gpt-5.4",
  });
  assert.deepEqual(profile.provider_model_map, profile.model_map);
  assert.deepEqual(profile.models, [{ name: "gpt-5.4", supports_1m: false }]);
  assert.equal(profile.config_options.write_general_config, true);
  assert.equal(profile.updated_at, 123);
  assert.equal(isSubscriptionProxyBaseUrl(profile.base_url), true);
  assert.equal(isSubscriptionProxyBaseUrl(`${profile.base_url}/`), true);
  assert.equal(isSubscriptionProxyBaseUrl(`${profile.base_url}/v1`), true);
});

test("subscription proxy excludes task-only and image models and prefers the newest Sol model", () => {
  assert.deepEqual(subscriptionProxyUsableModels(runningStatus.models), [
    "gpt-5.4",
    "gpt-5.6-sol",
  ]);
  assert.equal(
    selectSubscriptionProxyModel(runningStatus.models),
    "gpt-5.6-sol",
  );
  assert.equal(
    selectSubscriptionProxyModel(runningStatus.models, "codex-auto-review"),
    "gpt-5.6-sol",
  );
  assert.equal(
    selectSubscriptionProxyModel(runningStatus.models, "gpt-5.4"),
    "gpt-5.4",
  );
});

test("subscription proxy creates target-specific Claude Desktop and Grok Build profiles", () => {
  const desktop = buildSubscriptionProxyProfile(
    clientConfig,
    "claude_desktop",
    undefined,
    123,
  );
  assert.equal(
    desktop.id,
    SUBSCRIPTION_PROXY_CLAUDE_DESKTOP_PROFILE_ID,
  );
  assert.match(
    desktop.id,
    /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
  );
  assert.equal(desktop.base_url, "http://127.0.0.1:8317");
  assert.equal(desktop.api_format, "anthropic");
  assert.equal(desktop.auth_field, "ANTHROPIC_AUTH_TOKEN");
  assert.deepEqual(desktop.model_map, {
    main: "Fable5",
    haiku: "Fable5",
    sonnet: "Fable5",
    opus: "Fable5",
  });
  assert.deepEqual(desktop.provider_model_map, {
    main: "gpt-5.4",
    haiku: "gpt-5.4",
    sonnet: "gpt-5.4",
    opus: "gpt-5.4",
  });
  assert.deepEqual(desktop.models, [{ name: "Fable5", supports_1m: false }]);

  const grokBuild = buildSubscriptionProxyProfile(
    clientConfig,
    "grok_build",
    undefined,
    123,
  );
  assert.equal(grokBuild.base_url, "http://127.0.0.1:8317/v1");
  assert.equal(grokBuild.api_format, "openai_responses");
  assert.equal(grokBuild.auth_field, "OPENAI_API_KEY");
  assert.equal(grokBuild.compat_mode, "direct");
  assert.equal(grokBuild.model_map.main, "gpt-5.4");
  assert.deepEqual(grokBuild.models, [{ name: "gpt-5.4", supports_1m: false }]);
});

test("re-syncing the subscription proxy updates the stable profile without losing preferences", () => {
  const existing = buildSubscriptionProxyProfile(
    clientConfig,
    "claude_cli",
    undefined,
    123,
  );
  existing.display_name = "我的 ChatGPT";
  existing.note = "保留备注";
  existing.config_options.disable_auto_update = true;

  const updated = buildSubscriptionProxyProfile(
    {
      ...clientConfig,
      apiKey: "sk-switchpp-new",
      model: "gpt-5.5",
    },
    "claude_cli",
    existing,
    456,
  );

  assert.equal(updated.id, existing.id);
  assert.equal(updated.display_name, "我的 ChatGPT");
  assert.equal(updated.note, "保留备注");
  assert.equal(updated.api_key, "sk-switchpp-new");
  assert.equal(updated.model_map.main, "gpt-5.5");
  assert.equal(updated.config_options.disable_auto_update, true);
  assert.equal(updated.updated_at, 456);
});

test("running proxy automatically adds one idempotent profile to every supported target", () => {
  for (const target of ["claude_cli", "claude_desktop", "grok_build"] as const) {
    const added = syncSubscriptionProxyProfiles(
      [],
      null,
      runningStatus,
      target,
      "",
      123,
    );
    assert.equal(added.action, "added");
    assert.equal(added.profiles.length, 1);
    assert.equal(
      added.profiles[0].id,
      subscriptionProxyProfileIdForTarget(target),
    );
    assert.equal(added.profiles[0].upstream_model, "gpt-5.6-sol");

    const unchanged = syncSubscriptionProxyProfiles(
      added.profiles,
      null,
      runningStatus,
      target,
      "gpt-5.6-sol",
      456,
    );
    assert.equal(unchanged.action, "unchanged");
    assert.equal(unchanged.profiles, added.profiles);
    assert.equal(unchanged.profiles[0].updated_at, 123);
  }
});

test("Claude Desktop migrates the legacy automatic profile and applied marker to a UUID", () => {
  const legacy = {
    ...buildSubscriptionProxyProfile(
      clientConfig,
      "claude_desktop",
      undefined,
      123,
    ),
    id: SUBSCRIPTION_PROXY_PROFILE_ID,
  };
  legacy.display_name = "我的 ChatGPT";

  const migrated = syncSubscriptionProxyProfiles(
    [legacy],
    SUBSCRIPTION_PROXY_PROFILE_ID,
    runningStatus,
    "claude_desktop",
    "gpt-5.4",
    456,
  );

  assert.equal(migrated.action, "updated");
  assert.equal(migrated.profiles.length, 1);
  assert.equal(
    migrated.profiles[0].id,
    SUBSCRIPTION_PROXY_CLAUDE_DESKTOP_PROFILE_ID,
  );
  assert.equal(migrated.profiles[0].display_name, "我的 ChatGPT");
  assert.equal(
    migrated.appliedProfileId,
    SUBSCRIPTION_PROXY_CLAUDE_DESKTOP_PROFILE_ID,
  );
  assert.equal(
    isSubscriptionProxyProfileId(
      migrated.profiles[0].id,
      "claude_desktop",
    ),
    true,
  );
});

test("model selection updates and deduplicates the automatic profile", () => {
  const existing = buildSubscriptionProxyProfile(
    clientConfig,
    "claude_cli",
    undefined,
    123,
  );
  const updated = syncSubscriptionProxyProfiles(
    [existing, existing],
    SUBSCRIPTION_PROXY_PROFILE_ID,
    runningStatus,
    "claude_cli",
    "gpt-5.4",
    456,
  );

  assert.equal(updated.action, "updated");
  assert.equal(updated.profiles.length, 1);
  assert.equal(updated.profiles[0].model_map.main, "gpt-5.4");
  assert.equal(
    updated.appliedProfileId,
    SUBSCRIPTION_PROXY_PROFILE_ID,
  );
});

test("stopped proxy removes its profile and clears a dangling applied marker", () => {
  const existing = buildSubscriptionProxyProfile(
    clientConfig,
    "grok_build",
    undefined,
    123,
  );
  const removed = syncSubscriptionProxyProfiles(
    [existing],
    SUBSCRIPTION_PROXY_PROFILE_ID,
    { ...runningStatus, running: false },
    "grok_build",
  );

  assert.equal(removed.action, "removed");
  assert.deepEqual(removed.profiles, []);
  assert.equal(removed.appliedProfileId, null);
  assert.equal(removed.clearedAppliedProfile, true);
});

test("stopped proxy removes both current and legacy Claude Desktop automatic profiles", () => {
  const current = buildSubscriptionProxyProfile(
    clientConfig,
    "claude_desktop",
    undefined,
    123,
  );
  const legacy = {
    ...current,
    id: SUBSCRIPTION_PROXY_PROFILE_ID,
  };
  const removed = syncSubscriptionProxyProfiles(
    [legacy, current],
    SUBSCRIPTION_PROXY_PROFILE_ID,
    { ...runningStatus, running: false },
    "claude_desktop",
  );

  assert.equal(removed.action, "removed");
  assert.deepEqual(removed.profiles, []);
  assert.equal(removed.appliedProfileId, null);
  assert.equal(removed.clearedAppliedProfile, true);
});

test("Cursor summary keeps the OpenAI-compatible v1 base URL explicit", () => {
  assert.equal(
    buildCursorConnectionSummary(clientConfig),
    [
      "Base URL: http://127.0.0.1:8317/v1",
      "API Key: sk-switchpp-local",
      "Model: gpt-5.4",
    ].join("\n"),
  );
  assert.equal(
    buildCursorConnectionSummary({
      ...clientConfig,
      baseUrl: runningStatus.gateway_base_url,
    }),
    [
      "Base URL: http://127.0.0.1:23457/subscription/v1",
      "API Key: sk-switchpp-local",
      "Model: gpt-5.4",
    ].join("\n"),
  );
});
