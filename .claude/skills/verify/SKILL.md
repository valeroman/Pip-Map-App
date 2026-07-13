---
name: verify
description: Launch and drive pip-map-app (Expo/RN) end-to-end via web + Playwright to observe real behavior.
---

# Verifying pip-map-app changes

This app requires an authenticated session AND a group before reaching the
map screen (`app/_layout.tsx` gates: no session → `/(auth)/login`; session
without group → `/group-setup`; only then → `/(tabs)`). Register+group-setup
is the fastest way to reach a real, logged-in state — no seed accounts exist.

## Launch (web target)

```bash
npx expo start --web --port 8099 > /tmp/expo-web.log 2>&1 &
# poll until ready:
grep -q "Waiting on http" /tmp/expo-web.log
```

First request to `http://localhost:8099/` after startup can take 30-100s+
(Metro cold bundle) — `curl --max-time 120` it once before driving the page,
otherwise Playwright's `page.goto` with default 30s timeout throws.

Stop it afterward: find the PID via `netstat -ano | findstr :8099` (or
PowerShell `Get-NetTCPConnection -LocalPort 8099`) and kill it — `expo start
--web &` in bash detaches and isn't tracked by the harness's background-task
IDs, so `TaskStop` won't find it.

## Driving it — no claude-in-chrome in this env, use Playwright directly

No `playwright` devDependency in this repo and no browser downloaded via
this env's cached npx copy either. Workaround that worked:

```bash
export NODE_PATH="/c/Users/<user>/AppData/Local/npm-cache/_npx/<hash>/node_modules"
node script.js   # requires the cached npx playwright install
```

Find `<hash>` once via: `Get-ChildItem "$env:LOCALAPPDATA\npm-cache\_npx" -Recurse -Filter playwright -Directory`.

Launch with `chromium.launch({ channel: 'chrome' })` — the bundled
chromium/headless-shell revision the cached playwright expects is not
installed, but system Chrome (`C:\Program Files\Google\Chrome\Application\chrome.exe`) is, and `channel: 'chrome'` uses it directly.

## Gotchas specific to this app's RN-Web render

- **PipText auto-uppercases** `variant="label"|"title"|"display"` (see
  `components/PipText.tsx` `AUTO_UPPERCASE_VARIANTS`). Button labels like
  "Crear acceso" render as "CREAR ACCESO" in the DOM — match with
  `getByText(/^crear acceso$/i)`, not literal case.
- **Stack screens stay mounted** underneath the active one (React
  Navigation), so `getByPlaceholder(...)` / `getByText(...)` often resolves
  to 2+ elements (one hidden). Scope with a `:visible` CSS pseudo-class,
  e.g. `page.locator('input[placeholder="usuario@vault-tec.com"]:visible')`.
- **group-setup screen has two elements with identical text** — the mode
  tab button and the submit button are both labeled "Crear grupo" when
  `mode === 'crear'`. Use `.last()` to hit the submit button (DOM order:
  tabs row first, form second).
- **Logout button has no accessible role/name** — `StatusBarHeader`'s
  Pressable wraps a bare `SymbolView` with no text/label, and RN-Web
  doesn't emit `role="button"` for it. Click by coordinate instead:
  it's the icon at the far right of the header row, right of the signal
  bars — e.g. `page.mouse.click(1253, 93)` at the default 1280x720
  viewport. Confirm via body text after click (returns to the login
  screen instantly, `supabase.auth.signOut()` has no confirmation step).
- Registering via `app/(auth)/register.tsx` on this Supabase project does
  **not** require email confirmation — `signUp` returns a session
  immediately and the app auto-navigates to `/group-setup`.

## Useful flows to drive

- **Register → create group → map screen**: click
  `¿No tenés cuenta? Registrate`, fill Nombre/Email/Contraseña, submit,
  then fill the group name on `/group-setup` and submit "Crear grupo"
  (the `.last()` one). Lands on `/(tabs)` map screen.
- **Account switch**: click the logout icon (coordinate click, see above),
  then repeat registration with a second email/name to confirm any
  session-derived UI (e.g. the header's display name) updates.
