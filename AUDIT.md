# Client audit — 19 September 2026

Source: supplied `Idleon resources/app.asar`, entry `distBuild/static/game/N.js`.
Extracted file size: 25,160,946 bytes. SHA-256:
`49a106e5ea60bd6eb3ec36173b7f43720a2805329d1fe08a4fada822c617165c`.
The archive also contains `distBuild/static/game/lib/default.pak` (44,436,360 bytes).
No full-game code is executed by the web app.

## Confirmed corrections

1. **Cellular Warfare multiplies the other damage terms.** In
   `q._customBlock_JellyOperation`, the `CellDMG` branch uses
   `(1 + (Destruction I + II + III + Palette)/100) * (1 + Grid185/100)`.
   The inherited engine incorrectly added Grid185 into the Destruction/Palette sum.
   This matters now that the supplied save has Cellular Warfare level 2.
2. **Projectile jitter is already in pixels.** In ActorEvents_741's attack loop,
   launch X is `round(171 + 37*column + 18*baseX + jitter*random(-1,1))`,
   with the equivalent Y expression. The handoff's suggestion to multiply jitter
   by 18 was contradicted by the executable code. Corrected for every cell.
3. **Research[7][10] is remaining attempts**, not successful operations. The click
   handler decrements it on starting an obstruction above 1, and a win restores one.
   The supplied save has zero remaining attempts. Offline simulations remain usable.
4. **Array order is authoritative.** The client walks anchor indices in ascending
   order. Candidate arrays are normalized before simulation, so construction order
   cannot affect attack order, target-pool order, or seeded outcomes.

## Verified without changing the formulas

- Boss HP, normal timer, and Critical attack cooldown for all 72 obstruction indices.
- First 40 JellyUPG records: level cap, price growth, UpgradeQTY, and base-cost factors.
- Cell damage and cooldown formulas, Cells of Three, additive Mito/Gigacyst passives,
  Fever damage/speed, and EXP multiplier in the extracted JellyOperation function.
- Research Grid #185's Observation multiplier and Grid global multiplier formula.
- Organelle/virus relationships are populated in the board setup callback; the
  square-death path changes the dead mask without rebuilding those relationships.
- Body-square deaths do not stop a core. Immunoid body squares remain in the priority
  pool after core death. Immunoid hits set the boss counter to minus twice its cooldown.
- Projectile damage is stored on firing; hit processing does not inspect the shooter.
- Level-up loop precedes attacks, processes one type at a time, and sets a 20-update
  gate. Combined cell level is a separate DNSM cache with no invalidation in this loop.
- Attack charge uses integer startup rolls. The timer decrements by 1/60 each logical
  update; renderer FPS is not substituted for this counter.

Evidence entry points in the extracted file (character offsets, not line numbers):
`q._customBlock_JellyOperation` about 5,118,292; attack loop about 13,284,724;
`db.JellyUPG` about 14,351,430. Search `_customEvent_JellyStuff` for cache construction.
`test-client-audit.js` evaluates only the extracted pure formula function and upgrade
literal in a sandbox with synthetic attributes, not the complete game runtime.
External-account hooks are supplied explicitly there, so this test does not certify
all implementations of Gaming, Companions, Dream, or Sushi.

## Search and UI changes

- Defensive and offensive candidate lanes, partial boards, and mutations of several
  timed leaders. Whole-cell removal preserves placement legality.
- Finalists use equal samples and common seeds. Steroid timing is trained on a
  different seed set from the final comparison; unlocked Fevers are compared too.
- Failures are scored by end-of-attempt HP. A zero-clear sample is displayed as
  “no clear found,” with an approximate Wilson confidence interval, not impossibility.
- Worker progress, cancellation, remaining-attempt warning, sample death replay,
  and optional affordable-purchase/saving-target planning.

## Follow-up optimizer coverage recheck

- Re-scanned every extracted `q._customBlock_JellyOperation("...")` branch and call
  site. No additional combat, speed, EXP, Bloodcell, slot, Fever, Stronkroid, revive,
  or plot-purchase bonus path was found outside the paths already modeled.
- Rechecked the optimizer's use of cell roles. The timed simulation applies Amoeba
  weakening stacks, Plasmid/Ribosome passive terms, Organelle adjacency, Immunoid
  Critical shielding and delay, Virus infection, Mito speed, Gigacyst damage, Proximity,
  runtime Cell EXP, projectile travel, Stronkroid, revives, and Fever effects.
- Rechecked candidate search coverage. Candidate generation samples legal full and
  partial boards, relocates current placements, keeps shield-count lanes so Immunoid
  boards are tested, compares unlocked Fevers, and validates finalists with timed
  Monte Carlo runs instead of static DPS alone.
- A synthetic all-cell-unlocked generation pass produced legal boards containing every
  playable cell type and varied support/shield combinations. `npm test` passed after
  the recheck.
- Follow-up search improvements wire the UI's Quick/Normal/Deep `shortlist` setting
  into engine screening breadth, add bounded role-aware seeds for Proximity, Organelle,
  Virus, and Immunoid layouts, and preserve support lanes so these candidates are not
  discarded by the static proxy before timed simulation.
- Added regression coverage for shortlist breadth and role-aware legal layout generation.

## Deeper work still worth doing

- Compare predicted timing to recorded in-game runs. Tween elapsed time versus logical
  updates, UI startup delay, and the once-per-second COLD phase remain timing-sensitive.
- Revival selection is a heuristic with configurable reaction delay. It is not an
  exhaustive policy search, and immediate zero-delay clicks are applied on the next
  logical update. Stronkroid timing searches a discrete set rather than every frame.
- The exact global RNG stream also contains cosmetic random draws. Common seeds make
  model comparisons repeatable; they do not reproduce an actual game's hidden seed.
- Purchase planning does not simulate Bloodcell income over future attempts, account
  progression outside Jelly, or EXP earned between saves. Its saving target is a
  greedy path with fixed starting levels/layout, not a minimum-cost proof.
- Data-only exports may lack companion/Dream/Sushi inputs. The UI identifies calibration
  fallback; use a full export for those account bonuses.
- No evidence of obstruction-specific attack scripts was found in the inspected Jelly
  loop. This is not a proof that unrelated future client updates add none.

## Expanded cell and bonus audit

See [BONUS-AUDIT.md](BONUS-AUDIT.md) for the 0.7.0 incoming bonus dependency trace, all-cell mechanics, source quirks and verification limits.

The practice operation calls the same engine with automatic revives disabled and
explicit frame-addressed manual actions. It never writes the pasted JSON or calls the
game client.
