# Idleon cloud sync

Supports Google, Steam and email/password sign-in, optional remembered sign-in,
and Firestore updates. There are no writes to game saves and no planner backend.

## Data and authentication

- Steam opens `https://steamcommunity.com/openid/login` with Idleon's fixed
  `https://www.legendsofidleon.com/steamsso/` return URL. The user pastes the signed
  redirect. Strict origin/path, identity, required-field and duplicate-field checks
  precede exchange with `https://us-central1-idlemmo.cloudfunctions.net/asil`.
  That service verifies the Steam result and returns a Firebase custom token.
- Email/password and the custom token go to the official Firebase Auth SDK.
  `browserSessionPersistence` keeps tokens in this tab across reloads by default.
  Opting into remembered sign-in selects `browserLocalPersistence`. No password
  or Steam redirect is stored, logged or included in save data or analytics.
- The named Firebase app uses Idleon's public client configuration. These public
  identifiers confer no access by themselves; the signed-in user and game database
  rules control access. There is no admin key.
- The SDK is pinned to 12.19.0 and dynamically loaded from Google's CDN. Static
  hosting needs the allowed script/connect origins in `_headers`. GitHub Pages
  does not apply that file; hosts which enforce a different CSP must allow the
  equivalent origins. Email and custom-token auth do not require a popup provider.
- Listen to `_data/{uid}` in Firestore. For each server-confirmed snapshot, read
  character names from `_uid/{uid}`, companions from `_comp/{uid}`, guild membership
  from `_usgu/{uid}/g`, guild details from `_guild/{id}`, and `_vars/_vars` in
  Firestore. Feed `{data, charNames, companion, guildData, serverVars}` to the existing
  parser. Failed supplemental reads remain unavailable and produce a warning.
  Cached Firestore events do not claim a freshly received server save.

## Update lifecycle

The controller keeps one latest pending save. It ignores duplicate applied data,
out-of-order supplemental reads, and callbacks from old connections. Disconnect
invalidates work immediately, unsubscribes, and signs out. A sign-in that completes
after cancellation is also signed out. New logins wait for pending sign-out.

Home applies updates when visible and no form, dialog, manual paste or Jelly
optimizer is active. Other pages retain their current state and offer Apply update.
Applying uses the shared import path, restores the current page, and avoids
scrolling. Manual JSON import disconnects only after parsing succeeds; invalid
JSON leaves the loaded save intact. Clear also disconnects. Local notes and plans
are not cleared by sync or disconnect.

## Verification

`npm run test:cloud-sync` checks URL validation, auth exchange shape, data mapping,
session cancellation, ordering, deduplication, pending updates, browser login UI,
mobile layout, note/character selection preservation, retry and manual import.
The browser test uses a simulated account connection and the existing local save
fixture; it sends no credentials or test save to external services. `npm test`
includes the controller/adapter tests via `pretest`.

Real-account Steam and email sign-in still need a user-run check on the final
hosting origin. Automated tests cannot establish whether Idleon's current service
rules or cross-origin policy permit that origin. If a service rejects the request,
the connection bar reports failure and manual import remains available.

Protocol references inspected:
- https://github.com/Morta1/IdleonToolbox/blob/main/services/auth/steam.js
- https://github.com/Morta1/IdleonToolbox/blob/main/firebase/index.js
- https://firebase.google.com/docs/web/alt-setup
- https://firebase.google.com/docs/auth/web/auth-state-persistence

Recovery retries supported connection errors up to five times with exponential backoff and refreshes the Firebase token before resubscribing. Disconnect cancels recovery. Returning from the browser back/forward cache restarts the connection; returning to a visible tab retries a failed connection. Remembered sign-in is opt-in; passwords and Steam redirects are never persisted by the planner.
