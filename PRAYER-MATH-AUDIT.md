# Prayer optimizer calculation audit

## Source and account inputs

The worker decodes the supplied JSON with the locally vendored Idleon Toolbox parsers. Per-character stats, account bonuses, equipment, talents, current map/target, prayers and gem purchases feed the calculation. No manual statistics, gem purchases, slots or AFK schedule are required. The JSON is copied before parsing and never modified.

Slot calculation matches the installed client: highest class 32/34/35 level against 1/60/85/110/150/170/200/250, plus GemItemsPurchased[114], capped at 12. Missing purchase data is reported, not treated as zero.

Prayer contributions match _customBlock_prayersReal, including stacked 20% no-prayer superbits 9/39/53, the 9-or-39 activation gate and Tachion exclusion. Equipping any prayer disables that empty-loadout benefit.

## Comparison

All subsets of target-relevant prayers are evaluated under the imported slot limit, including the empty set. Unrelated prayers cannot improve the selected objective. Ties prefer fewer equipped prayers. The equipped setup, empty setup and winning setup are displayed.

For each prayer the winning setup's other prayers are held fixed. Four evaluations separate the loss of empty-loadout bonuses, its buff, its curse, and the net result. Contributions use a common without-prayer denominator so they sum to the net percentage change. Fixed effects are handled by their game activation gates.

## Objective scope

- Combat: damage, accuracy/hit chance, defence/survivability, monster HP, AFK kill rate and portal/Death Note kill multipliers. Class EXP uses ordinary kills, not multikill credits.
- Rare drops: ordinary kills times drop rate; a relative opportunity index, not exact item quantities.
- Coins: ordinary kills times coin multiplier; the saved monster's unchanged coin value cancels in the relative comparison.
- Damage, skill efficiency, all-skill EXP and capacity goals compare their named stat/component. They are not disguised resource/hour or skill EXP/hour estimates. Secondary penalties are shown explicitly.
- Printing: capped sample-rate component (90%), not complete sample size. Royal Sampler removal requirements remain visible.
- Shiny trapping: sum of expected shiny bundles from placed traps using their saved placement chance, open-time bonuses, 100% chance cap and (1 + curse) divisor.
- Minigames: rewards per play, including star signs, fishing talent where relevant and the saved available plays.
- Dungeons: the client doubles rewards and pass consumption through the same activation gate; there is no per-pass efficiency gain. The gate also sees passive prayer bonuses.
- Giants/crystals: probability per kill, using saved weekly giant count, shrine/vial bonuses, Tachion gate and Glitterbug's reciprocal curse. These objectives do not simulate active movement or active combat speed.

Only Unending Energy imposes the 10-hour AFK cap. Class EXP and combat comparisons use the saved elapsed interval (TimeAway.GlobalTime minus 1000 × PTimeAway_ID); a future claim schedule is not invented. The UI says explicitly what interval is evaluated. If the interval is missing, an uncapped claim comparison is not treated as known.

## Validation

Tests cover actual imported save decoding, no JSON mutation, derived 12-slot ownership, partial purchases, missing-data errors, exact prayer contribution parity with the installed game function when available, curse floors and combined penalties, capped sample rate, expected shiny outcomes, minigame cost accounting, no-prayer loss decomposition, old-versus-recommended output, complete set slot limits, worker freshness and page rendering. Live game measurements are not required or claimed.

## Planning ahead (2026-09-23)

The default UI mode is now Plan a setup. A target area can be chosen independently of the saved location. The model creates an isolated scenario that replaces map index, map name, target monster, AFK type, target display name and monster face together, while retaining JSON gear, talents and account upgrades. Area-specific formulas are reevaluated and scenario caches are separated by character, area and critter. Dynamic combat targets found in the JSON (such as Hole golems) are included alongside normal area targets.

Planning compares hourly rates before Unending Energy's ten-hour cap, so an unrelated past AFK absence is not applied to the hypothetical activity. Shiny planning uses a selected critter's placement/opening formula and chance cap per prospective trap, with no requirement for placed traps. Minigame planning retains the plays-per-attempt cost but does not require unspent plays today. Map unlocks are not inferred or enforced.

Saved location mode remains available. A missing activity no longer removes the saved character stats; the stats panel stays visible and the UI points to planning mode. Successful results show all finite character stats, including unchanged values, with the comparison expanded by default.
