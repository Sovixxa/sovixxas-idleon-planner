# Site-wide audit — 2026-09-28

Audited the current local working tree, preserving existing uncommitted work. No deployment was performed.

## Fixed

- **Loadouts navigation freeze:** removed the unnecessary synchronous full-account decode before rendering the reference build list. The initial browser sweep measured a 2,908 ms blocked navigation handler; the same sweep after the change measured 3 ms. Account-dependent tabs continue using their existing calculation workers. These are local Chromium measurements, not network or end-to-end load times.
- **Late carry-capacity results overwriting another page:** only apply a result while its original loading element and request still belong to the host. A dedicated browser regression delays the worker response, navigates to Credits, then verifies the result cannot replace Credits. It also verifies an active response still renders.
- **Unreachable manual save replacement:** moved “Change local save” out of the permanently hidden legacy header into the account controls. Verified switching from cloud sync to manual import, clearing the session, and ignoring late cloud callbacks.
- **Mobile horizontal overflow:** constrained the world-page grid and Legend Talent board; made character talent tabs scroll inside the book. Wide Golden Food tables retain their own horizontal scrolling.
- Updated the planner browser test to use the current Home Favorites layout and import a save before exercising that Home section after reload.

## Verification

- Default `npm test`: 81 test files passed.
- Ran all 45 additional existing test files omitted from the default command. Initial failures identified the hidden save button and outdated Favorites test. Both affected browser tests passed after repairs.
- Added `test-loadouts-navigation-browser.js` and `test-site-navigation-browser.js`.
- `npm run test:site-browser` combines the 128-page navigation/mobile sweep with loadouts navigation, cloud sync, and planner preferences/backup/restore tests. Set `AUDIT_DIST=1` to run the navigation sweep against the production build.
- Rebuilt the static site and checked versioned page/worker dependencies with `test-page-loading.js`.
- Rechecked decoder performance, save lifecycle, cloud-sync logic, planner preferences, character talents, endgame pages, Golden Food calculations, and live reload after the changes.

## Scope and limits

The sweep checks all 128 registered world/system routes at 1440 px desktop and 390 px mobile widths, records synchronous navigation time, and checks page ownership, JavaScript errors, missing local resources, and document overflow. It allows 600 ms for asynchronous page rendering; dedicated feature tests cover longer-running workers and interactions. Home import and account flows are covered separately. Existing tests use the local example account and synthetic edge cases, not every possible account.

Cloud login and updates were tested with the existing mocked adapter, not real credentials or a live Idleon service. No claim is made that every possible bug is eliminated, that every external community link works, or that live hosting latency matches local results. Weekly Bosses remains explicitly marked as not implemented.

Local detailed results are in ignored `audit-*.log` files; these are not included in the static build.

Final result: production navigation sweep and all four browser suites in test:site-browser passed. Across 128 routes: zero JavaScript errors, missing requested local resources, route ownership mismatches, or horizontal document overflows. Final Loadouts navigation measured 2 ms; the slowest synchronous route handler measured 91 ms. All 129 test files were exercised across the baseline, supplemental, build, and added regression runs; the two initial failing files passed after the fixes described above.

## Second independent pass

Repeated the full default suite (81 files), then reversed the 128-page navigation order and narrowed the mobile viewport to 320 px. Added environment options `AUDIT_WIDTH` and `AUDIT_REVERSE` to make the narrower/reversed sweep repeatable.

Additional fixes:

- All Bonuses now verifies the rendering request identity for both successful and failed asynchronous results. A reproducible browser test imports a newer save on the same page, resolves its calculation first, then resolves the old save. The old result previously replaced the new one. The test also covers stale failures after a newer render succeeds.
- Clearing a save now disposes the activity dashboard worker/timer, stops practice playback, and clears and invalidates the world-page host. The regression test demonstrated the dashboard disposal was previously skipped and verifies both cleanup and the cleared-save indicator.
- At 320 px, character talents use two columns, card presets scroll inside their panel, the Cards grid can shrink below its content width, and Equinox filters wrap. All three previously widened the document beyond the viewport. Targeted checks now report exactly 320 px document width, with screenshots visually inspected.

Rechecked save lifecycle, decoder performance, bonus loading, Dashboard browser interactions, Cards, Characters, and Equinox. Rebuilt static output and passed versioned dependency checks. The new save-navigation regression is included in `npm run test:site-browser`.

Second-pass final result: all 128 routes passed in reverse order at 320 px against production release 83d3a3a9d132, with zero page errors, missing requested local resources, or document overflows. All five browser suites in test:site-browser passed, as did the focused checks, server checks, runtime integration, and whitespace validation. Changes remain local; live credentials and production hosting were not exercised.

## Third pass — failed calculations and retries

Added fault-injection checks for Cooking, Bubble Optimizer and Stamps. The first run reproduced permanent cached errors/warnings in Cooking and Bubble Optimizer, plus Stamps resolving an empty worker error as a successful undefined model.

Fixes:

- Cooking evicts failed calculation results while retaining successful cached results, allowing the same imported save to retry when the page is reopened.
- Bubble Optimizer evicts warning results, handles worker construction/send failures as a visible fallback, and terminates workers and clears timers on failure.
- Stamps gives worker errors without a message a useful fallback error and cleans up if sending the save to the worker throws.

`test-worker-recovery.js` covers 15 cases across three calculators: worker error events, timeouts, reported calculation failures, constructor failures, and message-send failures. Each case verifies retry with the same save, successful caching, and timer/worker cleanup. It is included in the default test command.

`test-worker-recovery-browser.js` fails each calculator once, checks its visible error, reopens the page without replacing the save, and waits for real worker calculations to succeed. It supports `AUDIT_DIST=1` and is included in the site browser suite.

The navigation sweep now also asserts desktop document width before checking its configured smaller viewport. This pass uses 1440 px desktop and 768 px tablet widths; prior passes checked 390 px and 320 px.

Third-pass final result: the default 81-test suite and the new 15-case failure test passed; all six site browser suites passed, including failure recovery against production release 25e0afeb4270. All 128 routes passed desktop/tablet width checks with zero page errors, missing requested local resources, or document overflow. Normal Bubble Optimizer, Stamps, and All Account Bonuses feature browser suites also passed. Static build, versioned dependency checks, syntax checks for all 210 production JavaScript files, and whitespace checks passed. No deployment or live credential testing was performed.
