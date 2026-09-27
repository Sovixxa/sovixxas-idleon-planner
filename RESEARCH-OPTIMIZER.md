# Research optimizer

Open Research → Optimizer. Grid points and Lens layout have separate goals: Research EXP, Insight progress, or a balanced relative-rate score. Grid mode also supports a specific target square anywhere in the implemented catalog. Coordinates use row letter and column number (index 106 = F7).

## Grid points

The planner clones Research data and evaluates each legal candidate with the same `getResearch` source functions used by account decoding. It uses current unspent points, catalog level caps, the central starting cells, and orthogonal connectivity without row wrapping. A shortest connecting path is purchased one level at a time before a target upgrade. Automatic targets are the direct Research EXP/Insight/Kaleidoscope nodes and Divine Design; their immediate rates are compared per point. It repeats after each selected path. Pts Every Ten can generate extra points mid-plan.

Research point accounting now includes Jelly Operation rewards 4 and 57, using the installed client's `Research[7][9] > rewardIndex` gate and `Research[47]` reward values.

This is a greedy immediate-rate recommendation, not a globally optimal respec. It does not reclaim spent points. Non-Research account rewards can be routed to using the target selector. The saved lens arrangement and external account bonuses remain fixed when evaluating grid upgrades; newly granted lenses and future discoveries do not get speculative immediate value. Re-run lens planning after changing the grid in game.

## Observation lenses

The adapter derives per-lens Research EXP and Insight rates from the source calculation functions with no kaleidoscopes placed. The optimizer then applies orthogonal kaleidoscope multipliers to those unit rates. Eligible observations must be both discovered and unlocked. The shared per-observation limit applies to all three lens types combined. Counts come from owned magnifying glasses, monocles, and kaleidoscopes, with the total capped at owned lens slots.

Local search uses moves and pairwise swaps, up to eight passes, comparing a fresh layout with a valid saved layout. Research-only and Insight-only goals use the other rate as a tie-breaker, so neutral placements can still improve the secondary goal. Balanced compares log(1 + Research rate / saved rate) + log(1 + Insight score / saved score). Insight score sums each observation's rate divided by its next-level requirement; it is a progress proxy, not an exact simulated future level count. A locally optimal layout is not proof of a global optimum.

Output gives an 8-column observation panel, row/column coordinates, lens counts, changes in both rate metrics, and any unplaced lenses. It recommends clearing current lens placements before rebuilding to avoid displacement at full observations. Grid shapes and their rotations are held fixed; the lens optimizer concerns observation lenses, not Research-grid shape packing. No export or game state is modified.

## Validation

- `node test-research-optimizer.js`: connectivity, row boundaries, target paths, budgets, level caps through decoded candidates, lens capacity/ownership, saved-rate parity, non-mutation, and live sample plans.
- `node test-research-optimizer-browser.js`: real-save loading, both modes, target control, layout interaction, navigation, desktop/mobile rendering.
- World 7 / progression / shared calculation engine regressions and static build.

## Audit corrections
- Insight objectives use real Insight accrual, not the game's display-only Research EXP multiplier. Verified against installed client ObservationInsightExpRate and the Research[3] accrual loop.
- Grid buying respects the tutorial gate (OptionsListAccount[512] >= 2).
- Changing settings invalidates old/pending results.
- Board uses ResObj observation sprites, ResMagni lens sprites, and ResShape grid shape sprites.
