# Bonus freshness audit — 27 September 2026

Checked the official website and downloaded its current public web client. The latest official announcement retrieved was the September 18 Jelly Operator release. The existing local client is still current at the static-catalog level, but several planner copies and calculations were stale.

## Sources and evidence

- [Official release announcements](https://steamcommunity.com/app/1476970/announcements/).
- [Official web game](https://www.legendsofidleon.com/ytGl5oc/) and its linked [public client](https://www.legendsofidleon.com/ytGl5oc/N.js).
- Retrieved web-client SHA-256: `6de681a96813c15e95dccb4173d9a0a6cbe2564bb631955038a692bfdf14acd9`.
- Earlier local-client SHA-256: `49a106e5ea60bd6eb3ec36173b7f43720a2805329d1fe08a4fada822c617165c`.
- Local evidence: `../audit/bonus-freshness-2026-09-27.json`, `../audit/live-coverage-2026-09-27.json`, and `../audit/live-bonus-tests-2026-09-27.log`. Raw clients and account exports are not included in the static build.

## Corrections

- Added the missing Successful Jelly Operations Tome metric: save field `Research[7][9]`, capped at 800 points for 72 operations.
- Replaced the Tome page's outdated unlock formula with the client's current curve and current display order. The Jelly metric unlocks at account level 6,955.
- Replaced zero/default values for Tome metrics 109–120 with their saved Hat Rack, Minehead, crowns, stickers, tournament registrations, Research, Glimbo, Sushi, Button, Royal Statue, outpost and resource-grade values.
- The Tome page now uses all 122 current metric definitions and current scoring curves. Its calculated total chooses the highest-scoring character; its Epilogue display uses that corrected total when all necessary metrics are available. Missing late-game inputs remain unknown. This page correction does not replace every use of Tome calculations inside other bundled calculation engines.
- Corrected the reference descriptions for Tome efficiency/drop-rate scaling and the Slab talent's +0.15 multiplier per level.
- Refreshed all 178 companion records in both the pet page and the bundled CompanionRepo data. Gelatinous Cuboid and Glowfish no longer have unreleased placeholder bonuses. Their base/upgraded raw strengths now match the client: 9/19 for the sticker multiplier and 20/35 for stamina. The three Earl champion pets are present; their page icons use the ordinary Earl sprite.
- Expanded repeatable catalog tests from 19 comparisons to 78 direct/transformed comparisons. Fixed client-test extraction to handle web/desktop formatting and renamed local variables.

## Verification

- 231 extractable static array catalogs matched between the earlier local client and the newly downloaded public web client. No changed, added or removed array catalogs were found in that extracted set. Non-catalog functions that could not be evaluated are explicitly recorded in the JSON report.
- 78 planner/catalog comparisons pass against the live client, including cards, Divinity numeric fields, Royal Armory, Tome and the complete pet catalogs.
- Tome: 1,342 executable-client score/unlock comparisons, all 13 late-game mappings, missing-input handling and save immutability.
- Fountain: 30,960 executable-client comparisons; Spelunking: 6,528; Crystal Cove: 1,500; Bubba: 1,890.
- Jelly: all 40 upgrade records, 72 bosses, eight playable cells, six Fevers and mixed passive stacking.
- Killroy: seven bonus curves, consumers, unlock conditions and the arcade cap.
- Tome browser check: all 122 metrics render; Jelly search/details, bonuses, mobile width and browser-error checks pass. Screenshots are saved locally in `../audit/tome-current-desktop.png` and `../audit/tome-current-mobile.png`.
- Final `npm test` and `npm run build` passed after the companion refresh. Build release: `2b7de4a6a959`. Pet page integration and `git diff --check` also passed.

## Repeating the checks

Download a fresh official client to a separate audit file; preserve the earlier reference. From the app directory, use PowerShell:

```powershell
$env:IDLEON_CLIENT_PATH='../audit/live-N-2026-09-27.js'
npm run test:live-bonuses
Remove-Item Env:IDLEON_CLIENT_PATH
node inspect-bonus-freshness.js ../audit/N.js ../audit/live-N-2026-09-27.js ../audit/bonus-freshness-2026-09-27.json
node test-tome-current-browser.js
npm test
npm run build
```

Regenerate Tome definitions with `node extract-tome-data.js <client-path>`. Refresh the companion catalog and the existing bundle's companion data with `node build-companion-refresh.js <client-path>`. The latter preserves unrelated local calculation fixes instead of rebuilding from an older upstream checkout.

## Limits

This is a dated catalog and targeted formula audit, not a certificate that every bonus, cross-system dependency, character context, platform or future release is 100% equivalent to the game. Existing decoder behavior for older Tome metrics and other calculation engines still has its own coverage limits. An official catalog match alone does not establish runtime correctness—the stale companion copies and missing Tome metric found here demonstrate why both checks are necessary. Changes are local and built for review; this audit does not publish the website.
