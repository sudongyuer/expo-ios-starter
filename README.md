# expo-ios-starter

A starting point for iOS apps built with Expo and React Native, with one Swift
kit module for the UI that React Native cannot render at system quality. iOS
only.

What you get:

- Two tabs on the system tab bar, each with its own native navigation stack.
- `StarterKit`, a local Expo module with a native inset-grouped list.
- `present()`: open a page and `await` its result (`completed` or `cancelled`).
- Offline UI verification on the Simulator, with screenshots and video in light
  and dark appearance.
- zh-Hans and en strings with a missing-key check.
- CI for every push, and a TestFlight workflow you run by hand.

## Requirements

| Tool    | Version                                                    |
| ------- | ---------------------------------------------------------- |
| macOS   | with Xcode 26.4 or later and an iOS Simulator              |
| Node.js | 22                                                         |
| pnpm    | 12 (`packageManager` in `package.json`)                    |
| AXe     | for `pnpm ui-verify` (`brew install cameroncooke/axe/axe`) |

Expo SDK 57, React Native 0.86, minimum iOS 26.0.

## Start

```sh
pnpm install
pnpm ios          # prebuild, build and run on a Simulator (Debug, with Metro)
```

`apps/mobile/ios/` is generated and not committed. Native changes go into
`apps/mobile/app.config.ts`, a config plugin, or the kit module.

## Make it yours

```sh
pnpm rename --name "Acme Notes" --bundle-id com.acme.notes --scheme acme --kit AcmeKit
pnpm install
(cd apps/mobile && npx expo prebuild --platform ios --clean)
```

`--dry-run` lists the files it would change. The script rewrites the app
identity in `app.config.ts`, renames the kit module (directory, podspec, Swift
module, JS entry and imports), and updates deep links. Specs under `docs/specs`
are history and are left alone.

## Layout

```text
apps/mobile/
  app.config.ts             app identity, iOS settings, plugins
  src/app/                  routes (Expo Router)
  src/lib/presentation/     definePage / present() / usePageRuntime
  src/services/             the only code that talks to the outside world
  src/theme/tokens.ts       colors, spacing, radii, type
  locales/{zh-Hans,en}.json all user-visible text
  modules/starter-kit/      Swift kit module (StarterKitModule)
packages/core/              platform-neutral TypeScript (presentation store)
packages/config/            shared tsconfig and ESLint config
ui-checks/                  Simulator UI checks (AXe)
docs/specs/                 design specs and their index
```

`AGENTS.md` holds the rules for working in this repository.

## Commands

| Command          | What it does                                                |
| ---------------- | ----------------------------------------------------------- |
| `pnpm check`     | lint, typecheck, i18n, specs                                |
| `pnpm test`      | vitest (core, app logic, scripts)                           |
| `pnpm format`    | Prettier on changed files                                   |
| `pnpm bundle`    | export the iOS JavaScript bundle                            |
| `pnpm ui-verify` | build a verify build and run `ui-checks/` in light and dark |
| `pnpm rename`    | rename app, bundle id, scheme and kit                       |

See `ui-checks/README.md` for the UI checks.

## present()

```ts
export const PickColor = definePage<{ initial?: ColorId }, { color: ColorId }>({
  route: '/sheets/pick-color',
  presentation: 'modal',
})

const result = await present(PickColor, { initial: 'blue' })
if (result.status === 'completed') setColor(result.value.color)

const { params, complete, cancel } = usePageRuntime(PickColor)
```

Params stay in memory; the URL carries only a `presentationId`. Every
presentation settles exactly once: `complete`, `cancel`, swipe-down and
unmount all settle it, and later calls are ignored. A page opened without a
known `presentationId` (for example from a deep link) gets `params` as
`undefined` and shows an error state.

## CI and TestFlight

- `.github/workflows/check.yml` runs on every push to `main` and every pull
  request: `pnpm check`, `pnpm format:check`, `pnpm test`, `pnpm bundle`.
- `.github/workflows/testflight.yml` runs only when started by hand
  (`workflow_dispatch`). It archives a Release build on `macos-26` with Xcode
  26.6 and uploads it to TestFlight using automatic, cloud-managed signing.
  The build number is the workflow run number.

The TestFlight workflow needs these repository secrets and stops at its first
step, listing the missing ones, if any are absent:

| Secret                            | Value                                  |
| --------------------------------- | -------------------------------------- |
| `APP_STORE_CONNECT_API_KEY_ID`    | Key ID of an App Store Connect API key |
| `APP_STORE_CONNECT_API_ISSUER_ID` | Issuer ID shown with the key           |
| `APP_STORE_CONNECT_API_KEY_P8`    | Contents of the downloaded `.p8` file  |
| `APPLE_TEAM_ID`                   | Your Apple Developer team ID           |

Cloud-managed distribution signing needs an API key with the **Admin** role.
The app record must exist in App Store Connect with the same bundle id. The
workflow has not been run against a real account yet.

## License

MIT. See `LICENSE` and `NOTICE`.
