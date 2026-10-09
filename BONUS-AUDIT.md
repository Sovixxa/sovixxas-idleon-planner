# Cell mechanics and account bonus audit

Audited 19 September 2026 against the supplied `Idleon resources/app.asar`, extracted `distBuild/static/game/N.js`. SHA-256: `49a106e5ea60bd6eb3ec36173b7f43720a2805329d1fe08a4fada822c617165c`.

This describes that shipped client, not a claim about future game versions. Source anchors below are searchable symbols in the minified file. No game or save is uploaded.

## Eight playable cells

Every playable cell fires a projectile. Passive counts, adjacency and infection are cached when an operation starts and remain after square deaths. Effective counts include the Jelly count upgrades. A shape attacks while its core lives; losing a body square does not remove its attack. Already fired projectiles can hit after the core dies.

| Cell | Passive | Additional behavior |
| --- | --- | --- |
| Amoeba | +10% damage per effective count, additive with Ribosome | With Immuno Weakening, each landed Amoeba hit adds one permanent percentage point to the operation weakening term. |
| Plasmid | +15% speed per effective count, additive with Organelle | Projectile attack. |
| Ribosome | +50% damage per effective count, additive with Amoeba | Projectile attack. |
| Organelle | +25% speed per effective count, additive with Plasmid | A target footprint touching its surrounding buff area receives a separate 1.5x speed factor, increased by Sushi reward 63, capped at 1.75x. Multiple adjacency sources do not multiply this factor repeatedly. |
| Immunoid | No global stat passive | All living body squares receive Critical targeting priority. Each hit sets the boss counter to minus twice its cooldown, delaying the next hit to three cooldowns. Bodies still protect after their core dies. |
| Virus | No global count passive | Orthogonal adjacency infects entire target footprints. Damage factor is 1 + infected squares / 10. Viruses can infect one another. |
| Mito | Separate speed factor 1 + 0.5 times effective count | Fixed 4 by 4 footprint retains the client's permitted flat-index edge wrap. |
| Gigacyst | Separate damage factor 1 + 2 times effective count | Two effective copies give 5x, not 9x. |

Source: `q._customBlock_JellyOperation` (`MainAtkCD`, `MainAtkDMG`, `UnitSumAtk`, `UnitSumAtkCD`, `OrganelleSPD`), the Jelly actor's operation loop, `db.Research` rows 49-51. The ninth placeholder is not playable: the unlock count is capped at eight.

## Incoming combat bonuses

Write Qn for the quantity (level times upgrade strength) of Jelly upgrade n.

- Account damage = [1 + (Q18 + Q19 + Q20 + Palette1)/100] * (1 + Q21/100) * (1 + Q22/100) * (1 + Grid185/100) * [1 + Q32 * floor(cached total cell levels / 100)/100] * Fever damage.
- Individual level damage = 1 + level * (1 + Q17)/100. Levels stay fixed during combat; the total-level term remains cached.
- Base hit = 5 * cell base damage * account damage * passive damage * individual level damage * infection * proximity * weakening.
- Global passive damage = (1 + 2*Gigacyst) * (1 + 0.5*Ribosome + 0.1*Amoeba).
- Global passive speed = (1 + 0.5*Mito) * (1 + 0.25*Organelle + 0.15*Plasmid).
- Attack threshold = 1.5 * base cooldown / global passive speed / Fever speed. Each 60 Hz update adds 0.65 * adjacency * proximity * active Steroid to attack progress. Initial progress is randomized; excess charge is discarded on firing.
- Proximity upgrade Q13 applies to the client's specified core positions, as 1 + Q13/100 for damage and charge progress.
- EXP per landed shot = (1 + Fever EXP/100) * [1 + (Q30 + Q31 + Q10)/100] * (1 + Q11/100), with Biology required to earn EXP. Level-up checks run on a 20-update gate only while the level panel is visible (x > -5); operations move it to -135. Earned EXP is banked until idle.
- Stronkroid is one five-second activation per operation with client decrement-before-attack ordering; the optimizer searches its start time. Revives are direct clicks on a dead square, so the best-outcome default restores it in the same logical update. A reaction delay remains available for conservative tests. Revives do not rebuild passive caches or reset attack charge.
- Fever: COLD gains +1% damage per actor one-second callback, **only with DPS Biometrics (upgrade 12)**; RASH doubles damage; SEPSIS doubles Bloodcells; NAUSEA doubles cell EXP; RABIES gives 1.5x damage and 1.25x speed; PLAGUE gives 1.4x speed. Callback phase is randomized relative to operation start.

Palette1 is Gaming Mossy Green: level/(level+25) * 3, multiplied by the Legend Talent 10 and Lore 8 modifiers from Spelunk. Source: `_customBlock_GamingStatType` / GamingPalette / LegendPTS_bonus.

Grid185 and Grid187 use their base strength times level times assigned Observation strength times the global Grid multiplier. That global multiplier includes companion 55, companion 0 gated Research173, Dream Clouds 71/72/76 and Sushi reward 53. Source: `_customBlock_ResearchStuff`, `_customBlock_Companions`, `_customBlock_SushiStuff`, `db.Research` Observation rows 3/5.

Companion cache decoding preserves max owned level, the exact level-equals-one upgraded branch, borrowed IDs in OptionsListAccount[606] overriding to base strength, and companion 0's active-character Divinity level gate. If the export cannot resolve that gate, the bonus is unknown. Borrowed ownership reflects the export; in-game context changes can invalidate it.

## Bloodcell and progression bonuses

Currency multiplier = [1 + (Q23+Q24+Q25+Q33*cached total levels)/100] * (1+Arcade72/100) * (1+Grid187/100) * SEPSIS * (1+Have_ban_j) * (1+obstruction24 reward/100) * DPS multiplier * (1+Q26/100) * (1+Q27/100) * (1+Atom15/100).

- Arcade72: 5*level/(level+100), doubled at exactly level 101. The shipped Reindeer check doubles this only when companion27 equals exactly 1; upgraded value 1.5 fails that check. This executable quirk is preserved despite the companion tooltip.
- Atom15: one percentage point per atom level.
- Bundle ban_j requires saved value exactly 1; also contributes a plot purchase credit.
- Obstruction24 reward activates after obstruction24 is beaten and adds 30% Bloodcells.
- DPS multiplier uses the client's clamped logarithms, including decimal divisor 2.30259, and saved peak DPS. This factor can rise during an operation.
- Daily tries = round(2 + raw Grid186 level); Grid186's displayed base strength and global Grid multiplier do not apply here.
- Daily transfusion = saved best Bloodcells * Q38/100.
- Slot availability also includes Jelly plot upgrades, bundle credit and obstruction44 reward; the first two obstruction rewards add board squares.

Source: JellyOperation `CurrencyMulti`, `DPSmulti`, `DailyTries`, `BloodcellDaily`, `RoG_BonusQTY`; `_customBlock_ArcadeBonus`, `_customBlock_AtomCollider`, `_customBlock_Thingies`; `db.Research` rewards row46. Other outward Jelly rewards improve the character/account and do not feed back into cell combat unless explicitly referenced above. Generic character damage and generic skill EXP are not cell multipliers.

## Optimizer coverage recheck

The extracted `JellyOperation` branch list and call sites were rechecked after this
bonus audit. No additional Jelly combat, EXP, Bloodcell, slot, Fever, Stronkroid,
revive, or plot-purchase bonus branch was found outside the paths documented above.

The optimizer was also reviewed for cell-role coverage. Its timed model applies cached
passives and support effects for all eight playable cells, preserves body/core death
behavior, searches Stronkroid timing, compares unlocked Fevers, and validates finalists
with Monte Carlo runs. Candidate generation was spot-checked with all cell types
unlocked and produced legal layouts containing every playable cell type plus varied
support and Immunoid shield combinations.

The follow-up optimizer change wires the UI's `shortlist` quality setting into engine
screening breadth and adds bounded role-aware candidate seeds for Proximity, Organelle
adjacency, Virus infection, and Immunoid shielding. These candidates still compete by
timed simulation; support lanes only keep them from being filtered out by the static
proxy score too early.

## Supplied export results

- Palette +7%; Cellular Warfare +18.45%; global Grid factor 1.23x.
- Organelle adjacency 1.60x from 64 contiguous Sushi rewards; EXP 11x.
- RASH account damage 31.31818x before cell levels, counts, infection and position.
- Arcade Bloodcells +10.049751%; Grid187 +61.5%; Atom15 +59%; bundle 2x.
- Total Bloodcell multiplier 285.810162x at saved best DPS; 3 daily attempts; about 15.826 billion daily transfusion.
- The save has zero attempts remaining. No attempts or currency are spent by this app.

## Verification and limits

`npm test` checks 40 upgrade rows, all 72 bosses, all eight cell formulas, all six Fevers, mixed passive stacking, geometry, timed combat, search changes, and account decoding edge cases. The client formula test executes only an extracted pure function in a Node VM; external hooks are mocked. Dependency formulas above were traced in source, but this is not an automated full-client replay equivalence test.

The UI reports missing exported inputs explicitly. The simulator forecasts total Bloodcells per attempt, including failed attempts and overkill, and updates the DPS record multiplier. Search is stochastic and heuristic, not proof of a global optimum. Save freshness, actual client update cadence and manual action timing can change results. A run with no successful samples does not establish that clearing is impossible.

## 2026-10-09: occupancy, skills and board-setup audit

Rechecked against the same supplied client hash above. This audit does not assert
that the supplied September client is the latest live game build.

- The previous saved-example result was already full: 57 occupied squares out of
  57 unlocked. Locked squares and the center obstruction are not usable space.
  The generator did deliberately stop early for about 20% of random boards;
  these partial trials also appeared in the live preview.
- New clear-search candidates fill empty unlocked squares with Amoebas. The
  original saved board and remembered incumbent remain controls, and their full
  counterparts are always validated. Exact-score ties prefer greater occupancy.
  A partial control can still win if its measured score is strictly better;
  fullness does not override the clear objective. DPS/Bloodcell searches retain
  partial trials. The UI now shows occupied/unlocked squares.
- Cells of Three was correct: n + floor(n/3), independently for each non-Virus
  type. It adds passive counts, not extra attackers or doubled damage for every
  cell. For example 4 gives 5 effective counts; counts need not end at a multiple
  of three. Explicit 3/6/9 construction seeds improve search coverage without
  forcing every type onto a breakpoint at the expense of stronger mixtures.
- Filling candidates must not freeze placement refinement. Large shapes can
  exchange positions with Amoeba fillers while preserving the exact cell mix,
  legality and full occupancy.
- Shield-count lanes previously could consume almost the entire timed shortlist.
  They now share it with support layouts, static-DPS leaders and explicit Amoeba
  count lanes when Immuno Weakening is owned. This protects stack-building mixes
  whose eventual damage is understated by the static proxy. Previously found
  boards are revalidated as incumbents rather than trusting their old scores.
- Corrected an actual simulation error: level-ups were being processed during
  combat. The shipped level-panel condition prevents them. Attacks still bank
  EXP, but damage and Cell Dialysis use the starting levels for this attempt.
  Old-model playbook scores are kept in storage under their old context and do
  not compete with newly calculated scores.
- Expanded Stronkroid timing beyond the normal timer into the measured Critical
  lifetime, with bounded extra candidates. It remains a single activation.
- Trial-board mechanics now use the tested Fever instead of the saved Fever.

`test-client-audit.js` now executes the shipped `_customEvent_JellyStuff` setup
event with graphics calls stubbed. It verifies 208 upgrade/count combinations
(0 through 12 cells, all eight types, upgrade on/off), then compares the resulting
passive, adjacency, infection, Proximity, damage and charge-progress values on 96
legal layouts across all six Fevers. It also executes the shipped level-up block
with hidden and visible panel positions. Earlier formula tests supplied the
model's own count/adjacency cache to the client, so they could not independently
validate that setup; this closes that gap.

`test-jelly-clear-search.js` covers complete candidates, partial baseline controls,
breakpoint seeds, full-board relocation, Critical Stronkroid timing, equal-sample
refinement, shared Fever calibration, replay agreement and save preservation.
Run `npm run test:jelly-clear` for these and the engine/browser regression suite.
Projectile animation cadence and human skill-click timing remain approximations;
this is not a full graphical-client replay equivalence proof.

The final corrected-model example run retained the previously discovered full
board after revalidating it: 18 Amoebas, 6 Plasmids, 4 Ribosomes and 3 Organelles,
covering all 57 unlocked squares. Effective counts are 24, 8, 5 and 4 respectively.
RASH won, with Stronkroid at 15 seconds. On 500 fresh holdout simulations, median
remaining HP was 51.10%, versus 54.76% for the saved board; neither cleared.
This is evidence of improvement, not evidence that a clear is impossible or that
the global optimum was found. Detailed results are in
`../audit/jelly-clear-audit-2026-10-09.json`; the earlier verification file used
the superseded model and must not be used as current-model evidence.

### Stronkroid follow-up

Stronkroid was enabled throughout the optimizer, but early screening and
refinement always used the default immediate activation. Only finalists searched
activation times. This could eliminate a layout that needed a delayed burst.
Screening now tries up to five early/mid/late/ Critical timings per board;
refinement selects a full timing plan on training seeds, then scores it on the
independent refinement seeds. Final validation and replay use that same plan.

Simulation summaries report the scheduled time and actual activation count;
trace events record the single activation, multiplier and duration. A planned
activation after an attempt ends is correctly counted as unused. Disabled and
locked cases are also tested. `test-jelly-stronkroid.js` verified 12/12 activations
at 15 seconds on the example's saved board, with its 1.51x speed burst: mean damage
rose from 32,612,789 without the ability to 34,431,256 with it on matched seeds.
The browser summary now exposes this information for both saved and winning
boards. The Deep-run figures above predate this screening improvement.


## Account calculator audit fixes — 2026-10-09

Applied the confirmed calculator findings against the supplied `../audit/N.js`
client and example account export:

- Corrected fighting and skill AFK base percentage units, account-aware gear
  bonuses, character family amplification, Divinity activation, and Clamworks /
  Crystal Glunko Cove map rules.
- Added missing Jelly reward inputs to Research EXP, Insight, kaleidoscopes,
  maximum observation rolls, artifact chance, Class EXP, damage, exotic market
  purchases, crown odds, Spelunking power/discoveries/shop costs, and deity caps.
  Research lens planning carries the same reward context as the displayed rates.
- Applied character-specific Meritocracy eligibility to review metrics and
  character calculations. Removed cached vial, sigil, statue, Dragon statue,
  and slab-artifact amplification when the character has not unlocked it.
- Crystal Steak now reads reconstructed current primary stats instead of saved
  artifact tooltip snapshots. Character family consumers use the same ordered
  provider calculation, including skill AFK, efficiency, damage, HP, weapon power,
  kill credit, and sampling.
- Refreshed the early Hole and Equinox consumers after final Spelunking lore is
  available. This avoids adding whole-account parser passes. Fixed-clock tests
  compare these results with six passes at both low and high Jelly progression.
- Removed the phantom coral card bonus and retained the native card-level cap.

`npm run test:calculator-audit` exercises native AFK and Jelly functions, every
Jelly reward boundary, stale-stat invariance across the roster, downstream reward
consumers, family ordering, Meritocracy eligibility, Doot/W7 god activation,
coral card values, and parser dependency closure. The broader local regression
run passes 105 test files (`audit-fix-tests.log`, ignored by Git). Browser checks
cover All Stats, all target tabs, route replay, serial/parallel parity, worker
selection, cancellation, and mobile layout. Generated calculation bundles and
the static site have been rebuilt.

These checks are against the supplied client and account fixture; they do not
assert compatibility with unexamined future game updates.

Final exhaustive replay: 1465 upgrade scenarios across 52 metrics
(76,180 evaluations), with zero errors and no save mutation.
Shard reports: ../audit/review-target-scan-0.json and review-target-scan-1.json.
