# Full website audit — 2026-09-28

## Scope

Audited the current local working tree and rebuilt static website. Existing user changes were preserved. Nothing was committed, pushed, or deployed. This extends the three earlier regression sweeps recorded in `SITE-AUDIT-2026-09-28.md`.

Coverage includes all 128 registered system routes, Home, no-save navigation, imported-save navigation, responsive layout, visible control names, duplicate IDs, image alternatives, imported-name escaping, calculator/worker behavior, the local HTTP server, and production asset versioning. Dedicated feature tests exercise filters, optimizers, popup controls, settings, save import/clear/replacement, mocked cloud synchronization, and failed-worker retries.

## Confirmed issues fixed in this audit

| Area | Finding | Fix and verification |
| --- | --- | --- |
| Constellations | Navigating without a save threw an uncaught JSON decoding error. Async loading later replaced the world-tab view with a generic list. | Uses the existing asynchronous decoder, guards navigation changes, restores parent tabs, and keeps all six world tabs and 49 catalogue entries. Browser test covers both save states and delayed results. |
| Constellation details | Dismissal class had no matching CSS; details remained visible. | Added the missing hiding rule, Escape handling, and focus return. Browser test opens and dismisses details using the keyboard. |
| Catalogue loading | The browser fetched the entire 5.26 MB engine source again and scanned it to build the constellation catalogue. | Bundled the small catalogue directly. The unit test verifies every entry and field against the checked-in engine. |
| Monuments | The registered Monuments route showed a placeholder even though decoded monument data existed. | Routed it through the existing bonus renderer; browser test checks rendered monument tiles. |
| Accessibility | 31 loaded routes exposed search inputs without an accessible label. | Named the shared search controls. The complete semantic sweep now checks visible inputs, buttons, image alternatives, and duplicate IDs. |
| Local server | An encoded NUL/control character reached the filesystem and could crash the server. | Returns 400 for malformed/control-character paths; verified using both request-handler tests and real HTTP requests. |
| Local server | Hidden workspace files could be served; host and update-request origins were unchecked. | Rejects dotfile paths, unexpected Host headers, and cross-origin/cross-site Git update requests. Adds nosniff/no-referrer headers, HEAD handling, and stream-error cleanup. Real HTTP tests verify normal requests still work afterward. |
| Deployment cache | Seven qualified worker constructors bypassed release versioning. | Versions both plain and qualified Worker calls. Regression check scans every emitted root JavaScript file. |
| Deployment cache | Auxiliary HTML assets and build-recipe-only changes could retain stale asset URLs. | Versions Privacy page assets and includes HTML/build-recipe content in the release hash. |
| Sprite cache | Unversioned sprite filenames were configured as immutable for a year. | Uses a one-hour cache policy instead for hosts that honor `_headers`. |

## Verification

- Ran all 130 pre-existing test files outside the separately exercised build/navigation checks; no failures.
- Added and ran `test-server-http.js`, `test-constellations-browser.js`, and `test-site-structure-browser.js`.
- Rechecked the affected runtime integration, bonus loading, constellation catalogue parity, local server, Hole navigation, and production dependency graph after the changes.
- Production navigation sweep covers 1440 px desktop and 320 px mobile widths. Prior audits additionally checked 390 px mobile and 768 px tablet widths.
- Structure sweep covers 128 routes without a save and Home plus 128 routes with a save. A test account name containing an HTML image/event-handler payload remains text and does not execute.
- All test account operations are local. No messages, game actions, or account purchases are made.

Run `npm run test:all` to rebuild and execute every `test-*.js` file, including the browser suites. The runner writes `audit-all-tests.log` and exits unsuccessfully if any file fails.

Targeted repeatable commands:

```powershell
npm test
npm run build
node test-page-loading.js
$env:AUDIT_DIST='1'
$env:AUDIT_WIDTH='320'
npm run test:site-browser
npm run test:site-structure
```

The full test-file batch results are retained locally in ignored `audit-full-tests.log`. Browser structure, release checks, and real HTTP results are in the other ignored `audit-full-*.log` files. These logs are excluded from the static build.

## Remaining limitations and product gaps

- **Weekly Bosses is still explicitly unimplemented.** This is an existing product gap, not a passing implementation test.
- **Cold-loading payload remains large:** 158 initial script tags, about 9.53 MB of source JavaScript, or approximately 1.84 MB when each file is gzipped locally. These are size measurements, not observed production transfer totals. Local startup timing is not a mobile-network performance guarantee. Splitting/lazy-loading the remaining catalogues and decoders would be a separate architectural change.
- The deployment workflow runs the static build but does not run the full regression suite. Many tests depend on the private local example export; making the suite CI-portable requires a suitable non-private fixture.
- The published GitHub Pages URL could not be fetched through the available web tool. The deployed revision, real response headers, CDN caching, real network latency, and production telemetry were therefore not verified. A checked-in `_headers` file alone does not prove those headers are active on the host.
- Real Steam/email authentication, external community links, and live game-source freshness were not verified. Cloud behavior is exercised with the existing mocked adapter; calculations are checked against bundled code and local fixtures.
- Accessibility coverage is basic automated semantics plus targeted keyboard behavior. It is not a full WCAG contrast, screen-reader, or assistive-technology certification. Browser automation uses Chromium; Safari and Firefox were not exercised.

The audit provides evidence for the tested paths, not a guarantee that every account, device, or failure condition is bug-free.

## Final result

All 135 test files were exercised across the full batch and the separate build, navigation, and newly added regression runs. All passed; affected tests were repeated after fixes. The final rebuilt release passed all six site-browser suites and both structure/constellation suites. Across 128 system routes (plus Home in the structural sweep), the final checks reported zero uncaught page errors, missing requested local resources, unnamed visible controls, duplicate IDs, missing image alt attributes, or executed imported-name HTML. The 1440/320 px navigation sweep reported zero document overflow. The only remaining placeholder found was Weekly Bosses.
