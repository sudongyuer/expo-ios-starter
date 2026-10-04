# UI checks

Offline UI verification on the iOS Simulator. A Release build with
`EXPO_PUBLIC_UI_VERIFY=1` swaps `apps/mobile/src/services` for fixtures; screens
are production code. Each check opens a Debug scene by deep link
(`<scheme>://debug/scene/<id>`), drives it with AXe by accessibility identifier,
and captures screenshots (and video for motion).

```sh
pnpm ui-verify                          # build, then every check in light and dark
pnpm ui-verify --check sheet            # one check (comma-separate for more)
pnpm ui-verify --appearance dark        # light | dark | both
pnpm ui-verify --skip-build             # reuse the installed verify build
pnpm ui-verify --udid <UDID>            # use a specific simulator
pnpm ui-verify --locale en              # default zh-Hans
```

Without `--udid` the runner uses (and creates once) a simulator named
`Starter UI Verify`. Output goes to `artifacts/ui/<check>/<appearance>/`
(`*.png` + AX tree `*.json`, `run.mp4` for video checks, `result.json`) and
`artifacts/ui/summary.json`. A missing scene, a missing element, or a timeout
fails the run with a non-zero exit code.

## Checks

| Check      | Behavior                                                                                                                                                                       | Scene                        | Video |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ----- |
| `home`     | Home shows the present() example: a Color row with no value chosen yet, the idle footer, and a 44 pt touch target.                                                             | `home`                       | no    |
| `settings` | Settings renders the StarterKit grouped list; the demo switch turns on, and About shows the fixture version and build.                                                         | `settings`                   | no    |
| `sheet`    | present() opens the color picker as a modal: picking a color returns completed, the close button and a swipe down return cancelled, and a direct link shows the missing state. | `home`, `pick-color-missing` | yes   |

## Adding a check

1. Add a scene to `apps/mobile/src/debug/scenes.ts` (and its title to both locale files).
2. Give every element the check touches a `testID`; `GroupedList` rows get
   `<list testID>.<row id>`, switches `<row>.toggle`.
3. Add `checks/<name>.mjs` exporting `behavior`, `video` and `run(ui)`; wait on
   accessibility state, never on fixed sleeps. Add a row to the table above.
