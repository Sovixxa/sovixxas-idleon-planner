# Third bonus audit — 28 September 2026

## Source and scope

Downloaded the [official public game client](https://www.legendsofidleon.com/ytGl5oc/N.js) again to `../audit/live-N-third-pass-2026-09-28.js`. SHA-256: `6de681a96813c15e95dccb4173d9a0a6cbe2564bb631955038a692bfdf14acd9`, unchanged from the previous pass.

This pass audits the Divinity page's god-to-link mappings, blessing base values, upgrade costs and style unlocks. It does not certify all account multipliers or all game systems.

## Fixed

The catalog used the named god's row for its major and minor link effects. The client instead looks up `GodsInfo[godSlot][13]` and uses that second row for link descriptions and the minor multiplier. Blessings and upgrade costs still use the original row.

Corrected five gods:

| God | Correct major link | Correct minor link |
| --- | --- | --- |
| Arctis | Active in Lab without Lab EXP | Talent levels |
| Nobisect | Double portal/Death Note kills | Total damage |
| Goharut | Lab presence also counts at Divinity altar | Account AFK gains |
| Omniphau | Non-candy AFK claims advance another activity | Class EXP |
| Flutterbis | Divinity Pearl drops on qualifying skill levels | Skill EXP |

Added an explicit link index to `divinity-data.js` and corrected the prior catalog test, which compared the unmapped numeric column and therefore missed this defect. Names, icons, saved god slots, blessing rows and costs retain their original identities.

## Verification

`test-divinity-client.js` executes the extracted official Divinity handler in an isolated VM and checks:

- 630 minor-bonus comparisons: ten gods, seven skill levels, three Big P strengths and three Coral Kid strengths.
- 60 blessing/cost cases. Nobisect's account-dependent blessing remains explicitly unknown on this base-value page.
- All ten link mappings/descriptions and all eight style unlock levels.
- The actual client tooltip's second-row lookup, independently of the numeric handler.

The test is included in both `npm test` and `npm run test:live-bonuses`. Existing Divinity tests and 78 catalog comparisons also pass against the newly downloaded client.

`node test-divinity-browser.js` passes for all five corrected details and all ten god tiles, with no mobile horizontal overflow or page errors. Desktop and mobile screenshots are saved in `../audit/divinity-third-pass-desktop.png` and `../audit/divinity-third-pass-mobile.png`.

Changes are local; no website publication was performed.

Final validation: the complete live-bonus suite, full `npm test`, browser check,
and `npm run build` pass. Build release: `2e532cc693ea`; the built Divinity
catalog matches the corrected source. `git diff --check` passes.
Logs: `../audit/bonus-third-pass-live-2026-09-28.log`,
`../audit/bonus-third-pass-tests-2026-09-28.log`, and
`../audit/bonus-third-pass-build-2026-09-28.log`.
