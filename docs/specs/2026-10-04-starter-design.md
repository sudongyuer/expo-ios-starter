---
title: expo-ios-starter 模板工程
status: implemented
created: 2026-10-04
approved: 2026-10-04
implemented: 2026-10-04
supersedes:
superseded-by:
pr:
---

## Problem

每开一个新的 iOS App，都要从头搭导航、原生模块、验证、CI 和协作约束。
这些东西和产品无关，但做不好会让后面每个功能都返工：伪原生控件被打回、
界面改动没人验证、文案漏翻、签名被关掉后真机出问题。需要一个干净的起点，
新项目复制后改名就能直接进入设计语言和第一个功能。

## Goals and scope

**Do**

- 两个 tab（首页、设置）的可运行 Expo App，每个 tab 自己的原生导航栈。
- 一个 `present()` 示例：首页打开一个选择 sheet，选完返回 `completed` 和值，
  下滑或取消返回 `cancelled`，首页显示结果。
- 一个原生分组列表（设置页），由 Swift Kit 渲染。
- 一个 Debug 页，列出验证场景，只在开发构建和验证模式出现。
- 离线界面验证：三个检查（首页、设置、sheet），浅色和深色都出截图，sheet 出录屏。
- zh-Hans + en 文案，缺 key 检查。
- 主题 token：默认系统语义色，可整体替换。
- CI（check / test / i18n / bundle）和写好但默认不运行的 TestFlight 工作流。
- `rename` 脚本：一条命令改 App 名、bundle id、scheme、Kit 名。
- 模板级 `AGENTS.md`、spec / plan / acceptance / PR 模板。

**Don't do**

- Android：任何实现、兜底、构建脚本都不加。
- 状态管理库、数据请求库、登录、推送、OTA：留给具体项目决定。
- 自定义视觉风格：模板只用系统风格，项目在设计语言阶段替换 token。
- 拒绝的方案：
  - 纯 Swift/SwiftUI 模板：这次的目标是 RN 迭代速度 + Kit 补原生质量。
  - EAS Build/Submit：需要 Expo 账号且有免费额度限制；改用 GitHub macOS runner。
  - 预装 zustand / jotai：示例太小，装了只会被当成约定。

## Decisions

| Decision | Choice | Why | Alternatives considered |
| --- | --- | --- | --- |
| 结构 | pnpm monorepo：`apps/mobile` + `packages/{config,core}` | 平台无关逻辑可在 Node 里测，后续可加 web 或工具包 | 单包：后续拆分成本高 |
| Expo / RN 版本 | 建时最新稳定 SDK，按其 changelog 核实 Expo Router NativeTabs、Expo Modules API 用法。**建时取值：Expo SDK 57（57.0.26）、React Native 0.86.3、Xcode ≥ 26.4**（SDK 58 当时为 beta） | API 每个 SDK 都在变 | 固定旧版本 |
| 最低 iOS | 最新两个大版本里较低的那个；建时用 Expo 该 SDK 的最低要求核对，取两者较高值。**建时取值：iOS 26.0**（最新两版 27 / 26 取 26；SDK 57 要求 ≥ 16.4） | 用户决定 | — |
| 导航 | Expo Router：根 Stack + NativeTabs，每个 tab 目录有自己的 `_layout.tsx` Stack | 原生 tab bar 和导航栏 | JS tab bar：不是系统控件 |
| 页面弹出 | 自建 `definePage` / `usePageRuntime` / `present()`，见下节 | 调用方 `await` 一个结果，比路由参数回传更可靠 | 路由参数回传、全局事件 |
| 原生模块 | 单个本地 Expo 模块 `modules/starter-kit`，模块名 `StarterKit` | 所有原生能力一个入口，rename 时一起改 | 多个 bridge 包 |
| 测试 | vitest（Node 环境），`packages/core` 和 `apps/mobile` 的纯逻辑 | 与参考工程一致 | node:test |
| Lint / format | `expo lint`（ESLint flat config）+ Prettier 或 oxfmt，建时选一个并写进 AGENTS.md。**建时取值：Prettier** | — | — |
| i18n | `i18next` + `react-i18next` + `expo-localization`，`locales/{zh-Hans,en}.json`，en 为兜底 | 生态成熟 | 自写 |
| 验证运行器 | AXe CLI + `xcrun simctl`，Node 脚本驱动 | 无需 XCUITest 工程，可截图录屏 | XCUITest、Maestro |
| TestFlight | macOS runner + App Store Connect API key；只允许 `workflow_dispatch`；缺 secrets 时第一步报错退出 | 公开仓库 runner 免费，不需要额外账号 | EAS |
| 许可证 | MIT；`NOTICE` 保留参考工程的 MIT 声明 | MIT 要求保留声明 | — |

### 页面弹出协议（自己实现，不参考任何 AGPL 代码）

```ts
// 定义一个可被 present 的页面
export const PickColor = definePage<{ initial?: string }, { color: string }>({
  route: '/sheets/pick-color',
  presentation: 'formSheet',
})

// 调用方
const result = await present(PickColor, { initial: 'blue' })
if (result.status === 'completed') setColor(result.value.color)

// 页面内
const { params, complete, cancel } = usePageRuntime(PickColor)
```

契约：

1. `present()` 生成 `presentationId`，参数存在内存 store，路由只带 `presentationId`。
2. 每次 present 必定且只结算一次：`complete(value)`、`cancel()`、手势关闭、
   页面卸载都会结算；重复结算被忽略。
3. 页面被卸载而未结算 → `cancelled`。App 被杀 → Promise 不存在，无需恢复。
4. 找不到 `presentationId`（深链直接打开）→ 页面显示错误态并可关闭，不崩溃。
5. 状态机（创建、结算、幂等）放在 `packages/core`，用 vitest 覆盖；
   React 绑定和路由调用放在 `apps/mobile/src/lib/presentation`。

### Kit 模块约定

- `modules/starter-kit/ios/StarterKitModule.swift` 是唯一注册入口。
- 每个能力一个子目录（`GroupedList/`），原生视图通过 Expo Modules 的 View 导出。
- `modules/starter-kit/src/index.ts` 是 JS 唯一入口：类型化 props 和函数；
  App 代码不直接 `requireNativeModule`。
- 事件：`addListener` 返回订阅对象，调用方在 effect cleanup 中 `remove()`。
- 分组列表示例：sections + rows（标题、副标题、开关、导航箭头），点击事件回到 JS，
  使用系统 inset grouped 样式，支持动态字体和深色模式。

### 验证模式

- `EXPO_PUBLIC_UI_VERIFY=1` 构建时内联，Release 模拟器构建也能开；TestFlight 构建不设。
- fixtures 只在服务边界替换（模板里只有一个示例 service：设置页的“关于”信息）。
- Debug 页列出场景；每个场景可通过深链 `<scheme>://debug/scene/<id>` 直接打开。
- `pnpm ui-verify [--check <name>] [--appearance light|dark|both]`：
  启动模拟器、安装验证构建、按检查脚本点击（AXe 通过 accessibility id 定位）、
  截图到 `artifacts/ui/<check>/<appearance>/`，有动效的检查录屏。
- 场景缺失、元素找不到、超时都是失败，退出码非 0。

## Data flow and ownership

```
screens (apps/mobile/src/app)
  ├─ present() ─→ presentation store (packages/core 状态机) ─→ expo-router
  ├─ t() ─→ i18n (locales/*.json)
  ├─ tokens ─→ src/theme/tokens.ts（系统语义色）
  └─ StarterKit (modules/starter-kit/src/index.ts) ─→ Swift
services (src/services) ←─ 验证模式下替换为 fixtures
```

## Errors and degradation

| Failure | User sees | System does |
| --- | --- | --- |
| 深链直接打开 sheet，没有 presentationId | 错误态 + 关闭按钮 | 不崩溃，不调用任何结算 |
| 重复 complete/cancel | 无变化 | 只认第一次 |
| 文案缺 key | 开发时显示 key | `check-i18n` 在 CI 失败 |
| TestFlight secrets 缺失 | — | 工作流第一步报错退出，列出缺的名字 |

## Known limits

- 只验证模拟器和个人 team 真机；TestFlight 工作流在有付费开发者账号前无法实测。
- 没有 Swift 单元测试，Kit 行为由界面检查覆盖。

## Implementation order

每一步结束停下来给用户验收。

1. 脚手架：monorepo、Expo App、NativeTabs 两个 tab、i18n、token、lint/format/test、
   `AGENTS.md` 等文档，模拟器能跑。
2. Kit：`StarterKit` 模块骨架 + 原生分组列表，设置页使用它。
3. present：`packages/core` 状态机 + 测试，React 绑定，首页 → 选择 sheet 示例。
4. 验证：验证模式、Debug 页、AXe 运行器、三个检查。
5. 交付：CI、TestFlight 工作流（只手动触发）、`rename` 脚本、README。

## Verification

- `pnpm check`（lint + typecheck + i18n + specs）和 `pnpm test` 通过；CI 在 main 上绿。
- `packages/core` 测试覆盖：完成、取消、重复结算、未知 id、卸载未结算。
- `check-i18n` 测试：删掉一个 en key 后失败。
- `pnpm ui-verify` 离线跑完首页、设置、sheet，浅色和深色都有截图，sheet 有录屏。
- `rename` 到一个测试名后 `expo prebuild` 和模拟器构建成功（在临时副本里做）。
- 人工：两个 tab 用的是系统 tab bar 和导航栏；分组列表在深色、大字号下正常；
  个人 team 签名可装到真机。

## Implementation Record (2026-10-04)

PR: not opened yet · Commits: none yet (working tree, nothing committed). Artifact paths
below are local and git-ignored (`artifacts/`).

### What was built

- pnpm workspace `apps/mobile` + `packages/{config,core}` on Expo SDK 57.0.26 / React Native
  0.86.3, minimum iOS 26.0. Evidence: `apps/mobile/package.json`, `apps/mobile/app.config.ts`
- Root Stack + NativeTabs (`(home)`, `settings`), each tab with its own Stack and native
  large-title bar. Evidence: `apps/mobile/src/app/(tabs)/_layout.tsx:8`,
  `apps/mobile/src/navigation/tab-stack-options.ts:10`
- `StarterKit` local Expo module, single registration point; native inset-grouped list
  (sections, header/footer, title, subtitle, value, switch, chevron, checkmark; row press and
  toggle events). Evidence: `apps/mobile/modules/starter-kit/ios/StarterKitModule.swift:7`,
  `apps/mobile/modules/starter-kit/ios/GroupedList/GroupedListView.swift`
- `present()` protocol: state machine in `packages/core`, React bindings in
  `apps/mobile/src/lib/presentation`, PickColor example. Evidence:
  `packages/core/src/presentation.ts:39`, `apps/mobile/src/lib/presentation/use-page-runtime.ts:13`,
  `apps/mobile/src/lib/presentation/present.ts:7`, `apps/mobile/src/app/sheets/pick-color.tsx`
- i18n (i18next + react-i18next + expo-localization, en fallback) and `check-i18n`.
  Evidence: `apps/mobile/src/i18n/index.ts`, `scripts/check-i18n.mjs:35`
- Theme tokens on system semantic colors. Evidence: `apps/mobile/src/theme/tokens.ts`
- Verify mode (`EXPO_PUBLIC_UI_VERIFY=1`), fixture swap at `src/services`, Debug page and
  scenes reachable at `starter://debug/scene/<id>`, AXe runner with three checks.
  Evidence: `apps/mobile/src/services/index.ts:1`, `apps/mobile/src/debug/scenes.ts:3`,
  `ui-checks/run.mjs`, `ui-checks/checks/{home,settings,sheet}.mjs`
- CI (`check.yml`) and TestFlight workflow (`workflow_dispatch` only, secret check first).
  Evidence: `.github/workflows/check.yml`, `.github/workflows/testflight.yml:24`
- `rename` script. Evidence: `scripts/rename.mjs`, `scripts/rename.test.mjs`
- `AGENTS.md`, spec / plan / acceptance / PR templates, `README.md`, `LICENSE`, `NOTICE`.
  Lint boundaries (native imports only via the kit; `packages/core` platform-neutral)
  enforced in `packages/config/eslint.js:17`.

### Deviations from the design

| Design said | Shipped | Why | Confirmed by |
| --- | --- | --- | --- |
| Example `presentation: 'formSheet'` | `presentation: 'modal'` (full-height sheet with native title and close button); `definePage` accepts only `modal` / `fullScreenModal` | Expo Router SDK 57 renders no native header or header buttons in form sheets, so "下滑或取消" could not have a system cancel button | user, 2026-10-04 (chose B twice) |
| Grouped list scrolling not specified | List is non-scrolling inside an RN `ScrollView`; native sets its own height via `setViewSize` | Lets RN content sit around the list; touch handling adapted so scrolls never highlight rows | user, 2026-10-04 (chose B) |
| Row content: title, subtitle, switch, chevron | Also trailing value and checkmark; per-row accessibility identifiers | Settings/About values and the picker's selection; identifiers for UI checks | not intent-changing |
| Settings example content not specified | Demo switch, Language (opens system Settings), About page via the service boundary, Developer → Debug (dev / verify builds only) | Exercises every row type and the one fixture service | not intent-changing |
| Native navigation bar | Tab stacks and sheets use `headerTransparent` + no shadow | react-native-screens otherwise builds an opaque bar with a hairline, unlike iOS 26 | not intent-changing |
| `pnpm ui-verify [--check] [--appearance]` | Also `--skip-build`, `--udid`, `--locale` (default zh-Hans); default device is a reusable simulator named "Starter UI Verify" | Repeatable runs without rebuilding; one device per task | not intent-changing |

### Bugs fixed during implementation

- **Symptom:** Settings page blank after adding the native list.
  **Root cause:** RN gives the view height 0 until native reports one; UICollectionView lays
  out nothing in a zero-height frame, so no height was ever reported.
  **Fix:** grow the frame to the content until it settles, report once.
  (`GroupedListView.swift:226`)
- **Symptom:** ~1,300 layout passes per second after that fix.
  **Root cause:** `contentSize` KVO fires on every assignment, even with an unchanged value.
  **Fix:** relayout only when old ≠ new (`GroupedListView.swift:67`).
- **Symptom:** opaque white bar with a hairline on pushed pages.
  **Root cause:** react-native-screens calls `configureWithOpaqueBackground` unless the header
  background is transparent. **Fix:** shared tab stack options (`tab-stack-options.ts:10`).
- **Symptom:** "screens with the same name nested" warning. **Root cause:** `index/index.tsx`
  layout from the docs. **Fix:** `(home)` group.
- **Symptom:** mismatched react-dom 19.3 / worklets 0.13 / metro-config 0.87 installed.
  **Root cause:** pnpm 12 auto-installs peers. **Fix:** `autoInstallPeers: false`, recorded in
  `AGENTS.md` (Rules from incidents).
- **Symptom:** VoiceOver read "颜色" without its value. **Root cause:** trailing label accessory is
  not part of the cell's accessibility value. **Fix:** `GroupedListView.swift:198`.
- **Symptom:** UI-check preflight timed out; a missing scene passed. **Root cause:** SpringBoard's
  "Open in …?" prompt was only handled in one path; the ready element was already on screen
  before the link applied. **Fix:** one `openUrl` path (`ui-checks/driver.mjs:132`) and scene
  ids checked against the registry (`ui-checks/driver.mjs:158`).
- **Symptom:** typecheck failed without a dev server. **Root cause:** typed routes are generated
  by the dev server. **Fix:** `expo customize tsconfig.json` before `tsc`
  (`apps/mobile/package.json:11`).
- **Symptom:** renamed copy failed its own tests; Swift files not renamed; workspace path wrong
  for names with spaces. **Root cause:** rename rewrote its fixture, skipped every `ios/` dir,
  and assumed workspace = app name. **Fix:** `scripts/rename.mjs:29`, path-scoped skips,
  workspace read from `ios/` (`scripts/app-identity.mjs:13`).

### Verification

- `pnpm check` → lint, typecheck, i18n, specs pass (2026-10-04).
- `pnpm test` → 4 files, 25 tests passed. `packages/core/src/presentation.test.ts` covers
  completed, cancelled, repeated settlement, unknown id, other route, release while unsettled.
  `scripts/check-i18n.test.mjs` "fails when a key is deleted from en".
- `pnpm format:check`, `pnpm bundle` → pass.
- `pnpm ui-verify` (Release verify build, "Starter UI Verify", iOS 26.5, Xcode 26.6) → 6/6 pass:
  home, settings, sheet × light/dark; sheet has `run.mp4`. Screenshots opened and inspected.
  (`artifacts/ui/summary.json`, `artifacts/ui/<check>/<appearance>/`)
- Driver negative cases: missing scene, missing element, wrong value all fail.
- Rename in a temporary copy to "Acme Notes" / `com.acme.notes` / `acme` / `AcmeKit` →
  `pnpm check`, `pnpm test`, `expo prebuild`, Simulator Debug build succeed; built Info.plist
  has bundle id `com.acme.notes`, URL scheme `acme`, minimum iOS 26.0.
- Manual: system tab bar and native navigation bar; grouped list in dark mode and
  accessibility-extra-large text. (`artifacts/ui/step1-scaffold/`, `artifacts/ui/step2-kit/`)
- TestFlight secret check run locally: missing secrets listed, exit 1; all present, exit 0.

### Known limits

- Unverified: CI green on `main` — no remote repository was created.
- Unverified: install on a physical device with a personal team — no signing was configured.
- The TestFlight workflow has not run. Cloud-managed distribution signing needs an Admin-role
  App Store Connect API key; development-certificate handling on fresh runners may need
  follow-up on the first real run.
- Half-height sheets are not supported by `definePage`; they need a native implementation in
  the kit.
- The grouped list creates every cell (non-scrolling); it suits short lists, not long ones.
- Traditional Chinese falls back to en.
- Apps whose name has no ASCII letters get Xcode project name `app` (Expo's sanitizer).
