# Push notifications and app extensions

Rules that apply once a project adds push notifications or an app extension.

- The native SDK lives in the kit and initializes before React Native; it caches
  notification taps until JS acknowledges them. Persist extensions, App Groups, and
  entitlements through config plugins.
- Extensions never read the Keychain or open the network; the app shares a
  credential-free App Group snapshot with them.
- Notification taps resolve against the signed-in account and are dropped after an
  account switch. Debug fixtures never request real permission.
