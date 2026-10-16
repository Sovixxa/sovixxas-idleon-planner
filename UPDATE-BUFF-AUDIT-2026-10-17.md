# Update buff audit — 17 October 2026

Status: **open; full update coverage is not certified**.

Source: the supplied Steam `resources/app.asar`, extracted as `../audit/N.js` (Luminous Menagerie v1.23). Extracted source SHA-256: `a2657944c1f9e2dda4d58ed57ef2ede60d139078450fd536a5fb7bbb40b873a2`.

This audit distinguishes catalog entries, saved progress, applied calculation effects, and gameplay/planner support. An entry appearing on a page is not proof that its buff reaches every consumer. The available real example save predates Menagerie; new-state checks use synthetic edits to that save.

## Fixed in this audit pass

| Effect | Applied calculation |
|---|---|
| Crucible reward 1 | Orion feather generation ×5 |
| Crucible rewards 2, 8 | Research EXP additive +25%, +35% |
| Crucible rewards 3, 8 | Spelunking POW ×31, then ×81 total |
| Crucible rewards 5, 12 | Cooking speed ×10, then ×30 total |
| Crucible reward 7 | Poppy generation ×4 |
| Crucible reward 10 | Bubba generation ×3 |
| Crucible reward 15 | Class EXP ×21 |
| Menagerie unlock 22 | Research and artifact stickers leave the additive pool and become separate multipliers |
| Silver Jellyfish | Misc obol bonuses scale by `1 + Menagerie[0][9]/100`; STR/AGI/WIS/LUK retain their existing handling |

Crucible effects require unlock 8 and the corresponding best-wave threshold from `RANDOlist[115]`; progress alone does not activate locked rewards. The shared engine covers all seven rate consumers above. Older decoder hooks were also added for Orion, Bubba and cooking. Remaining older decoder paths require separate validation.

The artifact calculator now exposes 37 sources, including a separate sticker multiplier, and reconstructs its total using the new factor. Research, cooking, class EXP and Spelunking breakdowns expose the added Crucible contribution.

## Previously implemented, retained

Menagerie catalog/progress UI; Lumi rate and source breakdown; boost costs; research, cooking, mastery, class EXP, drop rate, Spelunking and land-rank boosts; first-upgrade clicker discounts; forge and shiny-trap buffs; summoning discounts; meal/shrine/atom/legend/shiny caps; sailing loot and Nightmariner factors; black stars and organic labels; Minehead upgrade doubling; yellow-jelly construction EXP; Omega Arcade and tier-7 artifacts. See `UPDATE-2026-10-17.md` for the earlier implementation scope and tests.

## Open audit findings

These must remain open before describing **all update buffs** as implemented:

1. **Singularity:** shared Coral Kid helper still covers upgrades 0–5 only. Native upgrades 6–11 use options 616–621. Trace Divinity points/EXP, damage above 35 gods, and all dependent planners; Lumi already reads its applicable option separately.
2. **Side jellies:** verify red-page reading consumers, blue-jelly mainframe changes, and green-jelly OmniJade assignments. Displayed progress does not establish applied effects.
3. **Other unlocks:** verify increased Pillar Coral and statue flair caps, first wizard-tower trait doubling, and the increased trait cap in their respective consumers.
4. **Crucible:** genetics-per-trash rewards 0/6/11/13 and reward 9 need separate consumer/gameplay coverage. Lumi rewards 4/14 were implemented earlier. Combat/team simulation is not supplied by reward math.
5. **Essence and automation:** full essence/hour, auto-ladle behavior and Slow Roast tower-defense effects remain unsupported or unverified.
6. **Older decoder and standalone planners:** finish parity checks for Poppy, Research, artifact stickers, misc obols, and independent clicker rate calculations. Shared-engine fixes alone do not certify those paths.
7. **Research formula:** native inspection also shows Arcade 63 as a separate multiplier while the current shared Research formula includes it in the additive pool. This predates the new Crucible fix and remains a separate correction.
8. **Mission progress:** remaining Opal/Tome mission values need direct save mappings. Do not substitute guesses for unavailable progress.
9. **Fresh update save:** validate the complete import and UI against a real save with these systems unlocked. Synthetic tests cannot establish that every new save layout has been handled.

## Verification

`test-update-buff-audit.js` checks 48 Crucible unlock/threshold boundaries, all seven shared rate consumers, sticker routing, and primary-stat exclusion from the misc obol multiplier. Existing Menagerie bonus and Sailing artifact model tests also pass after rebuilding. The audit does not certify unrelated save-lifecycle changes or unsupported gameplay planners.

Source-call evidence: `../audit/menagerie-buff-calls.json` and `../audit/update-secondary-buffs.json`.
