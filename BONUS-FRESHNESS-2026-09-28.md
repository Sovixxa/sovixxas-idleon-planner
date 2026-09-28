# Second bonus audit — 28 September 2026

This pass checks Arcade bonuses inside the shared calculation engine and companion decoding, beyond the page/catalog checks in the September 27 audit.

## Current source

Downloaded the [official public game client](https://www.legendsofidleon.com/ytGl5oc/N.js) again. Its SHA-256 is `6de681a96813c15e95dccb4173d9a0a6cbe2564bb631955038a692bfdf14acd9`, identical to September 27. The [official announcements](https://steamcommunity.com/app/1476970/announcements/) still show the September 18 Jelly Operator release as the newest retrieved entry.

## Confirmed and fixed

1. **Phantom King Doot.** The shared decoder converted an empty borrowed-pet token to number 0 and inserted it into the owned-companion map. A synthetic account with no pets and an empty borrowed field reproduced `dootOwned: true`. Empty tokens now remain empty; an explicit `0` still represents a legitimate Doot loan.
2. **Upgraded Reindeer doubled Arcade bonuses in the shared engine.** The Arcade page already followed the client's exact `Companions(27) == 1` rule, but the calculation bundle checked ownership alone. A level-100 Base Damage upgrade incorrectly returned 200 with upgraded-only Reindeer instead of the client's 100. The engine now resolves the saved upgrade level and borrowed override before dependent system calculations run. Base or borrowed Reindeer still gives 200 in this example.
3. **The shared Arcade catalog stopped at 72 records.** Added the current 73rd record, Jelly Bloodcells. The page catalog already contained it. All shared records now come from `ArcadeShopInfo`.
4. **Cosmic upgrade boundary.** The bundle used `level >= 101`; the client uses exactly `level == 101`. This defensive boundary now matches the page and client, including a synthetic level-102 case.
5. **Input consistency.** Companion parsing accepts encoded companion lists, duplicate copies, array rows, both account-options aliases and encoded options. Duplicate copies use the maximum saved level; the upgraded bonus applies only when that maximum equals one, matching the client. Invalid/blank IDs no longer become pet 0. Arcade page inputs with incomplete upgrade information remain unknown.

## Verification

- `test-arcade-companion-client.js`: 2,336 comparisons, including all 73 Arcade records, levels 0/1/9/10/99/100/101/102, and no/base/upgraded companion strengths.
- Formula comparisons execute the actual game `ArcadeBonus` handler **and** its `ArbitraryCode5Inputs` growth function; the growth formula is not replaced with a handwritten oracle.
- Eight full-save scenarios cover no pets, base Reindeer, upgraded Reindeer, borrowed-only Reindeer, borrowed upgraded Reindeer, duplicate copies, a synthetic higher pet level, and an explicit Doot loan.
- Checked Gaming's derived Arcade shovel-speed field after complete decoding, confirming the corrected value propagates before dependent calculations are performed.
- Checked imported-save immutability, empty borrowed lists, serialized data and missing upgrade information.
- Existing misleading-value tests and decoder-cache/performance checks pass.
- The complete live-bonus suite against the September 28 download, full `npm test`, and `npm run build` pass. Static build release: `f13c48697cda`.
- Tome browser checks pass for all 122 metrics, Jelly search/details, bonus rendering and mobile overflow, with no page errors. `git diff --check` passes.

Logs: `../audit/bonus-second-pass-live-2026-09-28.log`, `../audit/bonus-second-pass-tests-2026-09-28.log` and `../audit/bonus-second-pass-build-2026-09-28.log`.

## Maintenance

`build-companion-math.js` contains the readable companion-input adapter and guarded patches for the existing bundle. Run it after replacing/rebuilding that bundle:

```powershell
node build-companion-math.js ../audit/live-N-2026-09-28.js
$env:IDLEON_CLIENT_PATH='../audit/live-N-2026-09-28.js'
npm run test:live-bonuses
Remove-Item Env:IDLEON_CLIENT_PATH
npm test
npm run build
```

The script preserves unrelated bundle fixes, checks expected source signatures and supports repeat application. It refreshes only the Arcade catalog and audited companion/Arcade paths. It is excluded from the published build.

This extends verified coverage; it does not certify every cross-system bonus or every partial-export calculation. Changes are local, with no website publication performed.
