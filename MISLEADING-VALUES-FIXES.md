# Misleading values repaired — 24 September 2026

## Royal Armory

- Substitute numeric description tokens before cleaning text. `{` is the amount; `}` is the multiplier `1 + amount / 100`.
- Decode the release shelf order and unlock by the number of satisfied thresholds, matching `RoyalG("ArmoryUpgUNLOCKED")`. Locked cards show the actual shelf requirement and saved total, not the upgrade ID.
- Royal Statues now match `RoyalG("StatueBon")`: level zero gives nothing; level one gives the base; later levels add per-level scaling; Royal Reverence multiplies the result. Display multiplier descriptions rather than a percentage amount followed by a stripped name. Hide unnamed future statue entries from the page.
- Outpost fields previously labeled ranks are now labeled rank EXP.
- Missing levels, storage, grades and totals remain unknown in partial exports and shared bonus rows.
- Dollar-token formulas are not generic level multipliers. Implemented the directly verified fixed/local cases; context-dependent values that are not calculated are explicitly unavailable instead of being replaced with an unrelated number.

## Regular Statues

- Label the existing `level × rate` values as **base contributions**, both on Statues and in All Bonuses. These do not claim to be final character bonuses.
- Add character selection and identify whose saved levels are displayed.
- Decode Normal/Gold/Onyx/Zenith tiers from `StuG` / `StatueG`, and display missing levels/progress/tiers as unknown rather than zero.
- Recognize Onyx/Zenith ownership from recorded grades. Talent ownership checks use saved active presets and the actual Voodoo Statufication name, rather than any talent with “statue” in its name or an inactive preset.
- Missing cavern/system data is no longer described as proof that it has not been unlocked.

Full effective regular-statue totals and the remaining context-dependent boost calculations are still not implemented. Their limitation is now stated beside the values.

## Arcade

- Add a shared page/All Bonuses model for companion state, base contributions and final bonuses. Missing ownership/upgrade/token fields do not silently become “no companion.”
- Include confirmed base/borrowed Spirit Reindeer doubling and exactly-level-101 Cosmo doubling.
- The supplied client checks `Companions(27) == 1`, whereas the upgraded companion provides 1.5 and advertises 2.5×. Upgraded-only exports show the supplied-client result plus an explicit discrepancy note. Borrowed tokens overwrite the cache with the base bonus even when an upgraded copy is owned.
- Align the bundled character-stat Arcade parser and rebuild `prayer-math-engine.js` so these calculations use the same rule. This follows the supplied client, not a claimed verification against a newer live game build.

## Verification

- `npm run verify`: full test suite and static build passed (release `8e3d70b86165`).
- New `test-misleading-values.js` is in `npm test`. It checks partial exports, known-zero separation, shelf gates, numerical descriptions, character selection, base labels, and companion variants.
- Compared 45 Arcade formula/level/companion combinations and 12 Royal Statue cases with extracted functions/expressions from the supplied client, without running the full game.
- Additional regression checks confirm that base, upgraded and borrowed-plus-upgraded companion cases agree with the rebuilt character-stat engine.
- Local browser checks with the supplied sample confirmed corrected shelf requirements and Royal Statue multipliers, Statue tier/base labels and character switching, Arcade companion doubling, and All Bonuses loading. No browser errors were recorded during those checks.
- No deployment or game-save modification was performed. Refresh an already-open planner to load the changes.
