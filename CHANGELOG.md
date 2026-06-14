# Changelog

## v1.0.10 - 2026-06-15

Switch++ 小版本更新。本次聚焦自动更新清单修复，解决 macOS 端看到更新按钮后点击却提示“自动更新清单暂不可用”的问题。

### 功能亮点 / Highlights

- 修复发布流水线只构建 `dmg` 导致 macOS 没有 updater 可安装 artifact 的问题；macOS release 现在同时构建 `app` 与 `dmg`。 / Fixed the release pipeline issue where macOS only built `dmg` bundles and produced no updater-installable artifact; macOS releases now build both `app` and `dmg`.
- 修复多平台矩阵 job 互相覆盖 `latest.json` 的问题；所有平台会先上传各自 updater manifest，再由最终 job 合并成一个包含 macOS、Windows、Linux 的清单。 / Fixed matrix jobs overwriting `latest.json`; each platform now uploads its own updater manifest and a final job merges macOS, Windows, and Linux entries.
- 自动更新清单发布前会校验 `darwin-aarch64`、`darwin-x86_64`、`linux-x86_64`、`windows-x86_64` 平台键，避免再次发布缺平台的清单。 / The updater manifest now validates `darwin-aarch64`, `darwin-x86_64`, `linux-x86_64`, and `windows-x86_64` before upload to prevent incomplete manifests.
- 补充发布架构测试，锁定 macOS updater bundle 与最终 manifest merge 步骤。 / Added release architecture coverage for macOS updater bundles and final manifest merging.

### 界面预览 / Screenshots

**自动更新 / Auto Update**

![Codex 配置列表](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/main/docs/assets/screenshots/switchpp-codex-profiles.png)

### macOS 首次启动说明 / macOS First-Launch Notice

Switch++ 尚未通过 Apple 公证（notarization），macOS 首次启动时可能会阻止。安装到 `/Applications` 后请运行：

```bash
sudo xattr -rd com.apple.quarantine "/Applications/Switch++.app"
open "/Applications/Switch++.app"
```

## v1.0.9 - 2026-06-14

Switch++ 小版本更新。本次聚焦 Claude Desktop 模型菜单修复，解决配置已改为 Fable5 但 `/model` 弹窗仍显示旧 Claude Opus/Sonnet/Haiku 模型的问题。

### 功能亮点 / Highlights

- Claude Desktop 写入的 `inferenceModels` 现在统一使用 `Fable5`，让 `/model` 菜单和 Switch++ 配置保持一致。 / Claude Desktop `inferenceModels` now use `Fable5`, keeping the `/model` picker aligned with Switch++ configuration.
- 已保存的 Claude Desktop profile 会在加载和应用时迁移到 Fable5 可见模型，同时保留 DeepSeek、MiniMax、阿里百炼等供应商真实上游模型映射。 / Existing Claude Desktop profiles migrate to the Fable5 visible model on load/apply while preserving real provider model mappings for DeepSeek, MiniMax, Bailian, and similar upstreams.
- Anthropic/Claude Desktop preset、配置预览、保存路径和私有 core 写入逻辑改为共享同一组模型常量，避免只改 UI 默认值而真实配置仍回退旧模型。 / Anthropic/Claude Desktop presets, previews, save paths, and private-core writes now share one model source, preventing UI defaults from drifting away from real written config.
- 补充 Claude Desktop 预览与私有 core 迁移测试，锁定 Fable5 菜单和 provider 模型映射不互相覆盖。 / Added preview and private-core migration coverage so the Fable5 menu and provider model mappings do not overwrite each other.

### 界面预览 / Screenshots

**Claude Desktop 模型菜单 / Claude Desktop Model Picker**

![Codex 配置列表](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/main/docs/assets/screenshots/switchpp-codex-profiles.png)

### macOS 首次启动说明 / macOS First-Launch Notice

Switch++ 尚未通过 Apple 公证（notarization），macOS 首次启动时可能会阻止。安装到 `/Applications` 后请运行：

```bash
sudo xattr -rd com.apple.quarantine "/Applications/Switch++.app"
open "/Applications/Switch++.app"
```

## v1.0.8 - 2026-06-14

Switch++ 小版本更新。本次聚焦授权边界和源码开放边界，避免授权状态异常或公开源码本地构建造成错误放行。

### 功能亮点 / Highlights

- 授权状态读取失败时默认锁定付费功能，不再把异常状态当作可用试用状态放行。 / License status failures now lock paid access by default instead of treating an unknown state as an active trial.
- 收紧客户端授权判断：缺少 `access_allowed` 时默认视为未授权，并补充回归测试防止失败放行逻辑回退。 / Hardened client-side access checks so missing `access_allowed` defaults to locked, with regression coverage against fail-open behavior.
- 明确公开仓库是 source-available shell，不是完整官方构建；核心 native 实现、授权校验、配置写入、gateway 和安装诊断能力仍保留在私有 core。 / Clarified that the public repository is a source-available shell rather than the complete official build; the native core, licensing, config writes, gateway, and selected diagnostics remain private.
- 无私有 core 的环境会跳过内部专用测试，便于公开层审阅与贡献，同时官方发布仍在维护者环境运行完整验证。 / Environments without the private core now skip internal-only tests for public review and contribution, while official releases still run full maintainer-side verification.

### 界面预览 / Screenshots

**授权设置 / License Settings**

![Codex 配置列表](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/main/docs/assets/screenshots/switchpp-codex-profiles.png)

### macOS 首次启动说明 / macOS First-Launch Notice

Switch++ 尚未通过 Apple 公证（notarization），macOS 首次启动时可能会阻止。安装到 `/Applications` 后请运行：

```bash
sudo xattr -rd com.apple.quarantine "/Applications/Switch++.app"
open "/Applications/Switch++.app"
```

## v1.0.7 - 2026-06-14

Switch++ 小版本更新。本次聚焦官方版授权体验、试用期锁定和更新安全性，让免费试用与激活后的状态更清楚。

### 功能亮点 / Highlights

- 将免费试用期调整为 7 天；试用期内不做功能阉割，试用结束后未激活用户会锁定左侧应用与工具菜单，只保留设置入口用于激活。 / Changed the free trial to 7 days. Trial users keep full functionality during the trial; after expiry, app and tool navigation is locked except Settings for activation.
- 强化授权锁定路径：除了按钮禁用，应用层导航也会检查授权状态，避免通过调试入口绕过菜单锁定。 / Hardened license gating so app-level navigation also checks license access, preventing debug-path bypasses.
- 关闭 Tauri 开发者工具入口，减少通过 WebView 控制台调试绕过 UI 状态的风险。 / Disabled the Tauri WebView devtools entry to reduce console-based UI bypass risk.
- 已激活用户的设置弹窗不再显示“购买授权码”，并新增当前版本号展示。 / Activated users no longer see the purchase-license entry in Settings, and Settings now shows the current app version.

### 界面预览 / Screenshots

**授权设置 / License Settings**

![Codex 配置列表](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/main/docs/assets/screenshots/switchpp-codex-profiles.png)

### macOS 首次启动说明 / macOS First-Launch Notice

Switch++ 尚未通过 Apple 公证（notarization），macOS 首次启动时可能会阻止。安装到 `/Applications` 后请运行：

```bash
sudo xattr -rd com.apple.quarantine "/Applications/Switch++.app"
open "/Applications/Switch++.app"
```

## v1.0.6 - 2026-06-04

Switch++ 小版本更新。本次聚焦 Codex 官方登录配置安全性，以及 Hermes/OpenCode/OpenClaw/Pi 等客户端的模型字段写入准确性。

### 修复与改进 / Fixes & Improvements

- 修复 Codex 官方登录配置中“关闭 WebSockets”会误导用户的问题：官方 `openai` provider 是 Codex 内置 provider，不支持在不切换 provider 的情况下写入 `supports_websockets = false`，因此该选项现在会置灰，并在说明中展示官方配置依据。
- 移除此前会额外写入 `openai-sse` custom provider 的逻辑，避免切换官方登录 profile 后影响历史记录、登录态或官方 provider 行为。
- 官方 Codex profile 预览和保存时会清理当前路径不支持的运行选项，避免旧状态把不可用配置继续写进 `config.toml`。
- 改进 OpenAI API custom provider 认证预览：当 Base URL 为官方 API 且未填写 API Key 时，会写入 `requires_openai_auth = true`，避免生成空 bearer token。
- 改进 OpenCode、Oh My OpenAgent、OpenClaw、Hermes、Pi 和 Oh My Pi 的模型配置：按各自应用配置字段维护默认模型、可用模型、小模型或标题生成模型，不再把 Claude 模型映射字段误写进这些应用的 provider 模型列表。
- Hermes 配置说明更新为 CLI/Desktop 共享配置，并将 Hermes 入口提前，方便在 Codex/Claude 后快速配置 Hermes Agent。

## v1.0.5 - 2026-06-02

Switch++ 小版本更新。本次新增 Codex 记忆整理知识图谱，并优化记忆加载、重新加载和详情查看。

### 功能亮点 / Highlights

- 新增“记忆整理”：以知识图谱展示 Codex 生成记忆、纠偏层、扩展记忆、项目归属和召回关系。 / Added Memory Organizer: a knowledge graph for Codex generated memories, corrections, extensions, project grouping, and recall relationships.
- 改进记忆加载体验：首次进入不自动读取，点击“立即加载”后从 Codex 中获取；已加载过的会话再次进入直接展示图谱。 / Improved memory loading: first visit waits for explicit loading, while loaded sessions reopen directly to the graph.
- 优化图谱交互：父节点只展开/收起，叶子节点展示详情，详情面板可滚动且不会触发底层 hover 或画布缩放。 / Improved graph interaction: parent nodes expand/collapse only, leaf nodes show details, and detail panels scroll without triggering underlying hover or canvas zoom.
- 明确三方配置与官方账号能力边界：插件、移动端和 connector 仍需回到官方配置中管理和验证。 / Clarified that plugins, mobile access, and connectors should be managed and verified from an official profile.
- 合并本地网关图片输入、官方错误摘要和 Codex profile 去重修复。 / Included local gateway image-input handling, official error summaries, and Codex profile deduplication fixes.

### 界面预览 / Screenshots

**记忆整理 / Memory Organizer**

![记忆整理](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/main/docs/assets/screenshots/switchpp-codex-Memo.png)

### macOS 首次启动说明 / macOS First-Launch Notice

Switch++ 尚未通过 Apple 公证（notarization），macOS 首次启动时可能会阻止。安装到 `/Applications` 后请运行：

```bash
sudo xattr -rd com.apple.quarantine "/Applications/Switch++.app"
open "/Applications/Switch++.app"
```


## v1.0.3 - 2026-05-31

Switch++ 小版本更新。本次重点修复 Codex Desktop 三方厂商配置里的自定义模型列表：DeepSeek、阿里百炼等配置现在可以由用户维护多个真实上游模型，切换官方配置时也不会再残留三方 provider 信息。

### 功能亮点 / Highlights

- 修复 Codex Desktop 三方配置切换后“自定义”模型列表为空的问题：Switch++ 会写入 `custom` provider、`model_catalog_json` 和本地 `/models` catalog，让 Codex 能读取三方模型候选。 / Fixed empty Codex Desktop Custom model menus for third-party profiles by writing the `custom` provider, `model_catalog_json`, and the local `/models` catalog.
- 支持在三方配置中手动添加多个上游模型，并在模型发现候选中把选中的模型填入当前聚焦输入框。 / Added manual multi-model editing for third-party Codex profiles, with discovered candidates filling the currently focused model field.
- 修复三方模型重复显示、provider 名称冗余显示、以及切回官方 Codex 配置后仍显示三方模型的问题。 / Removed duplicate third-party model entries and provider-name clutter, while keeping official Codex profiles on the default official behavior.
- 修复自定义模型列表拖动排序后被校正回原顺序的问题；保存后 Codex 自定义列表顺序会与 Switch++ 配置文件顺序一致。 / Fixed custom model drag sorting snapping back; saved Codex model order now follows the Switch++ configured order.
- 改进 Codex 本地网关模型映射：三方模型按用户配置顺序映射到 Codex 可识别的模型槽位，不再按旧的 flash/coder 启发式重排。 / Improved local gateway model slot mapping so third-party models keep the user-configured order instead of being reordered by legacy heuristics.
- 保留官方登录态隔离：三方配置只写入专用 `custom` provider 和 provider bearer token，不改写官方 `auth.json`。 / Preserved official-login isolation: third-party profiles write the dedicated `custom` provider and provider bearer token without rewriting official `auth.json`.

### 界面预览 / Screenshots

**Codex 配置列表 / Codex profiles**

![Codex 配置列表](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/main/docs/assets/screenshots/switchpp-codex-profiles.png)

**新增 Codex 配置 / New Codex profile**

![新增 Codex 配置](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/main/docs/assets/screenshots/switchpp-codex-new-profile.png)

**Claude Code 配置列表 / Claude Code profiles**

![Claude Code 配置列表](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/main/docs/assets/screenshots/switchpp-claude-code-profiles.png)

**兼容网关概览 / Gateway overview**

![兼容网关概览](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/main/docs/assets/screenshots/switchpp-gateway-overview.png)

**兼容网关调用记录 / Gateway request history**

![兼容网关调用记录](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/main/docs/assets/screenshots/switchpp-gateway-requests.png)

**本地环境检查 / Environment check**

![本地环境检查](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/main/docs/assets/screenshots/switchpp-environment-check.png)

### macOS 首次启动说明 / macOS First-Launch Notice

Switch++ 尚未通过 Apple 公证（notarization），macOS 首次启动时可能会阻止。安装到 `/Applications` 后请运行：

```bash
sudo xattr -rd com.apple.quarantine "/Applications/Switch++.app"
open "/Applications/Switch++.app"
```

Switch++ has not passed Apple notarization yet, so macOS may block it on first launch. After installing to `/Applications`, run:

```bash
sudo xattr -rd com.apple.quarantine "/Applications/Switch++.app"
open "/Applications/Switch++.app"
```

## v1.0.2 - 2026-05-30

Switch++ 小版本更新。本次重点解决 Claude Code 三方模型接入、兼容网关判断、菜单栏图标和本地化文案中的实际问题，让配置写入后更容易判断“是否需要网关、为什么失败、该如何验证”。

### 修复与改进 / Fixes & Improvements

- 修复 Claude Code 使用部分三方 Anthropic-compatible 端点时容易直连失败的问题：Switch++ 会识别需要本地兼容网关的配置，并提示通过本地网关完成模型映射、请求清洗、工具 schema 压缩和兼容转发。
- 改进 Claude Code 兼容网关状态说明，不再只展示“建议/必须开启”，而是拆分说明当前问题、开启收益和仍有限制，帮助判断失败来自厂商端点、协议兼容还是本地配置。
- 修复 Claude Code / Claude Desktop 网关启停语义，支持用户在网关页手动关闭本地兼容网关，并用 switch 开关展示当前启停状态。
- 修复配置应用后的提示文案，去掉“写入磁盘”等偏实现细节的表述，改为描述配置已写入以及需要重启目标应用后生效。
- 修复英文模式下的中英混排问题，包括网关状态、刷新按钮、短状态和动作文案，避免出现 `已Start` 这类半翻译状态。
- 修复菜单栏图标显示为黑块、比例过细或与 Dock 图标混用的问题，改为独立的 switch 模板图标。
- 修复 Windows release 打包脚本对 `PATH="$HOME/.cargo/bin:$PATH"` 的依赖，避免 Windows 构建找不到 Tauri 命令。
- 补齐 CI 对私有核心和 Linux Tauri 依赖的检查，避免本地验证通过但主分支 CI 因缺少私有核心或系统库失败。
- 全新 UI 升级提升视觉体验。

### 界面预览 / Screenshots

**Codex 配置列表 / Codex profiles**

![Codex 配置列表](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/main/docs/assets/screenshots/switchpp-codex-profiles.png)

**新增 Codex 配置 / New Codex profile**

![新增 Codex 配置](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/main/docs/assets/screenshots/switchpp-codex-new-profile.png)

**Claude Code 配置列表 / Claude Code profiles**

![Claude Code 配置列表](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/main/docs/assets/screenshots/switchpp-claude-code-profiles.png)

**兼容网关概览 / Gateway overview**

![兼容网关概览](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/main/docs/assets/screenshots/switchpp-gateway-overview.png)

**兼容网关调用记录 / Gateway request history**

![兼容网关调用记录](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/main/docs/assets/screenshots/switchpp-gateway-requests.png)

**本地环境检查 / Environment check**

![本地环境检查](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/main/docs/assets/screenshots/switchpp-environment-check.png)

### macOS 首次启动说明 / macOS First-Launch Notice

Switch++ 尚未通过 Apple 公证（notarization），macOS 首次启动时可能会阻止。安装到 `/Applications` 后请运行：

```bash
sudo xattr -rd com.apple.quarantine "/Applications/Switch++.app"
open "/Applications/Switch++.app"
```

Switch++ has not passed Apple notarization yet, so macOS may block it on first launch. After installing to `/Applications`, run:

```bash
sudo xattr -rd com.apple.quarantine "/Applications/Switch++.app"
open "/Applications/Switch++.app"
```

## v1.0.1 - 2026-05-26

Switch++ 小版本更新。本次重点改进 Claude / Codex 本地兼容网关、后台流量统计、推荐配置项和公开说明，让第三方模型接入 Claude Desktop、Codex Desktop 和 Claude Code 时更容易诊断、更稳定。

### 更新亮点

- 改进本地兼容网关统计，区分缓存命中、缓存创建和上游未上报缓存字段，避免把没有 cache 字段的请求误判为“缓存未命中”。
- 将代理转发与流量统计解析拆分为不同模块，降低后续替换统计实现或引入第三方统计方案时对网关代理路径的影响。
- 支持 Claude Code / Claude Desktop 的 `bypassPermissions` 权限选项，以高风险按需勾选方式写入配置。
- 新增 Claude Desktop 推荐配置策略，区分 Claude Code 与 Claude Desktop 的稳定性选项，减少把 CLI 专属字段误用于桌面端。
- 改进 Codex / Claude 的 token、缓存、错误和趋势图展示，便于判断问题来自账号、模型、协议、缓存还是本地网关。
- 安装并启用打包内置托盘图标，修复部分环境下托盘图标缺失或回退为默认图标的问题。
- 更新 README、下载页和 Release 页面文案，突出 Switch++ 在 Claude Desktop、Codex Desktop、官方登录态隔离、本地兼容网关、请求诊断和可审计写入上的差异化能力。

### 为什么选择 Switch++

Switch++ 不只是一个 provider 切换器，而是面向 Claude / Codex 桌面与本地 agent 生态的三方模型接入控制台：

- **Claude Desktop 深度适配**：管理桌面端第三方配置库，让 Claude Desktop 可以通过本地网关、官方模型名映射和厂商真实模型转发使用第三方模型。
- **Codex Desktop 官方登录态隔离**：三方模型写入专用 `agent-switch` provider，尽量保留官方 `auth.json`、ChatGPT 登录壳、插件入口和移动端连接能力。
- **本地兼容网关**：当目标应用与上游厂商协议不一致时，由 Switch++ 负责协议适配、模型映射、认证隔离、请求记录和统一启停。
- **可诊断的请求链路**：请求详情、token、缓存命中、缓存创建、错误记录和趋势图都在本机可见，方便判断是账号、模型、协议还是网关问题。
- **写入前可审计**：生成的 JSON / TOML 配置会先预览，推荐选项以勾选框呈现，并在应用前创建备份，降低误写配置的风险。
- **本地 agent 工具链管理**：覆盖 Claude Code、Claude Desktop、Codex、Hermes、OpenCode、OpenClaw、Pi、Oh My OpenAgent、Oh My Pi 等常见本地 agent 入口。

### 界面预览 / Screenshots

**Codex Desktop 使用 DeepSeek 三方模型 / Codex Desktop with a DeepSeek third-party model**

![Codex Desktop 使用 DeepSeek 三方模型](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/v1.0.1/docs/assets/screenshots/switchpp-codex-desktop-deepseek.png)

| Codex 配置列表 / Codex profiles | 新增 Codex 配置 / New Codex profile |
| --- | --- |
| ![Codex 配置列表](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/v1.0.1/docs/assets/screenshots/switchpp-codex-profiles.png) | ![新增 Codex 配置](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/v1.0.1/docs/assets/screenshots/switchpp-codex-new-profile.png) |

| Claude Desktop 配置切换 / Claude Desktop profiles | 本地环境检查 / Environment check |
| --- | --- |
| ![Claude Desktop 配置切换](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/v1.0.1/docs/assets/screenshots/switchpp-claude-desktop-profiles.png) | ![本地环境检查](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/v1.0.1/docs/assets/screenshots/switchpp-environment-check.png) |

| 兼容网关概览 / Gateway overview | 兼容网关调用记录 / Gateway request history |
| --- | --- |
| ![兼容网关概览](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/v1.0.1/docs/assets/screenshots/switchpp-gateway-overview.png) | ![兼容网关调用记录](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/v1.0.1/docs/assets/screenshots/switchpp-gateway-requests.png) |

| Claude Desktop 模型菜单 / Claude Desktop model menu | Claude Desktop 经由本地网关响应 / Claude Desktop through local gateway |
| --- | --- |
| ![Claude Desktop 模型菜单](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/v1.0.1/docs/assets/screenshots/switchpp-claude-model-menu.png) | ![Claude Desktop 经由本地网关响应](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/v1.0.1/docs/assets/screenshots/switchpp-claude-gateway-chat.png) |

### macOS 首次启动说明

Switch++ 尚未通过 Apple 公证（notarization），macOS 首次启动时可能会阻止。安装到 `/Applications` 后请运行：

```bash
sudo xattr -rd com.apple.quarantine "/Applications/Switch++.app"
open "/Applications/Switch++.app"
```

### English

Switch++ patch release focused on Claude / Codex local gateway reliability, backend traffic statistics, recommended configuration options, and public messaging. Third-party model access through Claude Desktop, Codex Desktop, and Claude Code is now easier to diagnose and more stable.

#### Highlights

- Improve local gateway usage statistics by distinguishing cache hits, cache creation, and upstream responses that do not report cache fields.
- Split proxy forwarding from usage-stat parsing, reducing the impact of future metrics implementation changes on the gateway proxy path.
- Add the Claude Code / Claude Desktop `bypassPermissions` option as a high-risk, opt-in checkbox.
- Add Claude Desktop-specific recommended configuration rules, separate from Claude Code CLI options.
- Improve Codex / Claude token, cache, error, and trend displays to help identify account, model, protocol, cache, or local gateway issues.
- Install and use the bundled tray icon so desktop builds do not fall back to a missing/default tray icon.
- Update README, download page, and Release page copy around Claude Desktop, Codex Desktop, official-login isolation, local compatibility gateway, request diagnostics, and auditable writes.

#### Why Switch++

Switch++ is not just a provider switcher. It is a third-party model access console for Claude / Codex desktop workflows and local agent toolchains:

- **Claude Desktop first-class support**: manage the desktop third-party config library, route Claude Desktop through the local gateway, and map official Claude model names to real provider models.
- **Codex Desktop with official-login isolation**: write third-party models to a dedicated `agent-switch` provider while preserving the official `auth.json`, ChatGPT login shell, plugin entry points, and mobile connection path as much as possible.
- **Local compatibility gateway**: when a target app and upstream provider speak different protocols, Switch++ handles protocol adaptation, model mapping, auth isolation, request records, and unified start/stop.
- **Diagnosable request path**: request details, tokens, cache hits, cache creation, errors, and trend charts stay visible locally, making it easier to identify account, model, protocol, or gateway issues.
- **Auditable writes**: generated JSON / TOML is previewed before writing, recommended options are exposed as checkboxes, and backups are created before applying changes.
- **Local agent toolchain management**: cover Claude Code, Claude Desktop, Codex, Hermes, OpenCode, OpenClaw, Pi, Oh My OpenAgent, Oh My Pi, and other local agent entry points.

#### macOS First-Launch Notice

Switch++ has not passed Apple notarization yet, so macOS may block it on first launch. After installing to `/Applications`, run:

```bash
sudo xattr -rd com.apple.quarantine "/Applications/Switch++.app"
open "/Applications/Switch++.app"
```

## v1.0.0 - 2026-05-26

Switch++ 首个正式公开版本。这个版本面向日常使用者，而不是内部测试版本；后续公开发布从 `v1.0.0` 开始。

### 功能亮点

- 让第三方模型稳定进入 Claude Code、Claude Desktop、Codex CLI、Codex Desktop 以及常用本地 AI 编程工具。
- 支持 DeepSeek、MiniMax、Kimi、GLM 等国产模型接入 Codex 客户端及 Claude 客户端，并提供本地协议适配路径。
- 支持国产模型接入 Codex 后配合使用官方插件和移动端能力；需先登录官方账号并添加官方配置，再与三方模型配置搭配使用。
- 在官方账号模式和第三方模型厂商模式之间快速切换。
- 为不同工具保存多套配置，并支持新增、编辑、复制、删除、排序和一键应用。
- 写入前预览配置内容，并在应用前自动保留备份，便于回退。
- 内置主流厂商预设、模型发现、能力提示和配置建议，减少手动试错。
- 提供本地兼容网关，统一承接 Claude 与 Codex 的第三方模型调用，并处理 Anthropic / OpenAI / Responses / Chat Completions 之间的协议差异。
- 展示网关状态、调用记录、消耗统计、缓存读写、错误记录和趋势图表，方便定位问题。
- 检查本机工具、应用、配置文件、安装版本和可升级状态。
- 支持一键安装、升级、卸载常用 CLI 工具。
- 支持中英双语界面、紧凑侧边栏、系统托盘和桌面原生窗口体验。

### 为什么选择 Switch++

Switch++ 不只是一个 provider 切换器，而是面向 Claude / Codex 桌面与本地 agent 生态的三方模型接入控制台：

- **Claude Desktop 深度适配**：管理桌面端第三方配置库，让 Claude Desktop 可以通过本地网关、官方模型名映射和厂商真实模型转发使用第三方模型。
- **Codex Desktop 官方登录态隔离**：三方模型写入专用 `agent-switch` provider，尽量保留官方 `auth.json`、ChatGPT 登录壳、插件入口和移动端连接能力。
- **本地兼容网关**：当目标应用与上游厂商协议不一致时，由 Switch++ 负责协议适配、模型映射、认证隔离、请求记录和统一启停。
- **可诊断的请求链路**：请求详情、token、缓存命中、缓存创建、错误记录和趋势图都在本机可见，方便判断是账号、模型、协议还是网关问题。
- **写入前可审计**：生成的 JSON / TOML 配置会先预览，推荐选项以勾选框呈现，并在应用前创建备份，降低误写配置的风险。
- **本地 agent 工具链管理**：覆盖 Claude Code、Claude Desktop、Codex、Hermes、OpenCode、OpenClaw、Pi、Oh My OpenAgent、Oh My Pi 等常见本地 agent 入口。

### 界面预览 / Screenshots

**Codex Desktop 使用 DeepSeek 三方模型 / Codex Desktop with a DeepSeek third-party model**

![Codex Desktop 使用 DeepSeek 三方模型](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/v1.0.0/docs/assets/screenshots/switchpp-codex-desktop-deepseek.png)

| Codex 配置列表 / Codex profiles | 新增 Codex 配置 / New Codex profile |
| --- | --- |
| ![Codex 配置列表](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/v1.0.0/docs/assets/screenshots/switchpp-codex-profiles.png) | ![新增 Codex 配置](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/v1.0.0/docs/assets/screenshots/switchpp-codex-new-profile.png) |

| Claude Desktop 配置切换 / Claude Desktop profiles | 本地环境检查 / Environment check |
| --- | --- |
| ![Claude Desktop 配置切换](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/v1.0.0/docs/assets/screenshots/switchpp-claude-desktop-profiles.png) | ![本地环境检查](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/v1.0.0/docs/assets/screenshots/switchpp-environment-check.png) |

| 兼容网关概览 / Gateway overview | 兼容网关调用记录 / Gateway request history |
| --- | --- |
| ![兼容网关概览](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/v1.0.0/docs/assets/screenshots/switchpp-gateway-overview.png) | ![兼容网关调用记录](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/v1.0.0/docs/assets/screenshots/switchpp-gateway-requests.png) |

| Claude Desktop 模型菜单 / Claude Desktop model menu | Claude Desktop 经由本地网关响应 / Claude Desktop through local gateway |
| --- | --- |
| ![Claude Desktop 模型菜单](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/v1.0.0/docs/assets/screenshots/switchpp-claude-model-menu.png) | ![Claude Desktop 经由本地网关响应](https://raw.githubusercontent.com/sssstwee/switch-plus-plus/v1.0.0/docs/assets/screenshots/switchpp-claude-gateway-chat.png) |

### macOS 首次启动说明

Switch++ 尚未通过 Apple 公证（notarization），macOS 首次启动时可能会阻止。安装到 `/Applications` 后请运行：

```bash
sudo xattr -rd com.apple.quarantine "/Applications/Switch++.app"
open "/Applications/Switch++.app"
```

### English

Switch++ first public stable release. This version is intended as the first official external release; public release history starts from `v1.0.0`.

#### Highlights

- Bring third-party models into Claude Code, Claude Desktop, Codex CLI, Codex Desktop, and common local AI coding tools.
- Connect domestic model providers such as DeepSeek, MiniMax, Kimi, and GLM to Codex and Claude clients through local protocol adaptation when needed.
- Use official Codex plugins and mobile features alongside domestic model profiles after signing in with an official account and adding the official configuration.
- Switch quickly between official-account mode and third-party provider mode.
- Save multiple profiles per tool, then add, edit, duplicate, delete, reorder, and apply them quickly.
- Preview local configuration before writing it, with backups created before changes are applied.
- Use built-in provider presets, model discovery, capability notes, and recommendations to reduce trial and error.
- Route Claude and Codex third-party model calls through the local compatibility gateway, including Anthropic / OpenAI / Responses / Chat Completions protocol differences.
- Inspect gateway status, request history, usage statistics, cache reads, cache creation, recent errors, and trend charts.
- Check local tools, apps, config files, installed versions, and available upgrades.
- Install, upgrade, and uninstall common CLI tools from the app.
- Use the bilingual desktop interface with compact navigation, tray support, and native window behavior.

#### Why Switch++

Switch++ is not just a provider switcher. It is a third-party model access console for Claude / Codex desktop workflows and local agent toolchains:

- **Claude Desktop first-class support**: manage the desktop third-party config library, route Claude Desktop through the local gateway, and map official Claude model names to real provider models.
- **Codex Desktop with official-login isolation**: write third-party models to a dedicated `agent-switch` provider while preserving the official `auth.json`, ChatGPT login shell, plugin entry points, and mobile connection path as much as possible.
- **Local compatibility gateway**: when a target app and upstream provider speak different protocols, Switch++ handles protocol adaptation, model mapping, auth isolation, request records, and unified start/stop.
- **Diagnosable request path**: request details, tokens, cache hits, cache creation, errors, and trend charts stay visible locally, making it easier to identify account, model, protocol, or gateway issues.
- **Auditable writes**: generated JSON / TOML is previewed before writing, recommended options are exposed as checkboxes, and backups are created before applying changes.
- **Local agent toolchain management**: cover Claude Code, Claude Desktop, Codex, Hermes, OpenCode, OpenClaw, Pi, Oh My OpenAgent, Oh My Pi, and other local agent entry points.

#### macOS First-Launch Notice

Switch++ has not passed Apple notarization yet, so macOS may block it on first launch. After installing to `/Applications`, run:

```bash
sudo xattr -rd com.apple.quarantine "/Applications/Switch++.app"
open "/Applications/Switch++.app"
```
