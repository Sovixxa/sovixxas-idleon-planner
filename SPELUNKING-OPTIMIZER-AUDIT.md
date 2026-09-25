# Spelunking optimizer calculation audit

Checked against the supplied `../audit/N.js` game client. This is not a live-client version check.

- `Spelunk("ShopUpgCost")`: multiply Amber Hoard by cooking `1/(1+mealBonus*firstCharacterFactor/100)` and `max(0.1,1-(max(sushi6,sushi27)+jelly22)/100)`. First-character factor is 1 below skill Lv 50, otherwise 2. Jelly requires obstruction >22. Apply discounts before the fixed `level²+5*level` surcharge. Manual calibration replaces the cooking/Sushi/Jelly multiplier and keeps Amber Hoard separate.
- Example save: cooking bonus 376.722816%, first character Lv 508; Sushi 50%, Jelly 10%. Non-Hoard multiplier is 0.046868832059591865.
- `AmberDropChance`: `min(0.8,(15+45*raw7/(250+raw7)+bonus52)/100/(1+9*bonus67))`.
- `AmberDropChance2nd`: `(5+bonus42)/100/(1+19*bonus67)` with temporary elixir stacks held at zero. The actual drop loop uses `floor(random+chance)`, so expected drop count is `1+chance`, not a probability clamped at one.
- `AmberGain`: includes Supply Swap's `1+14*bonus67`, selected one-based depth for Deep Pockets, and selected fully-cleared-depth count for Jobs All Done. Upgrade 66 changes denomination but has no gain term in the supplied client.
- `ElixirNotUsed`: shop + lore chapter, capped at 60%. `POW` stays 2 before tutorial step 8.
- Grey Hardhat: `round(2+(LegendPTS_bonus(2)+bonus48)/100)` statues on a double-drop proc. Doublethink Memory uses `floor(1+bonus58/100)`. Both are ranked using the full next-breakpoint batch cost, with each purchased level retained in the checklist.
- Outside scoring accounts for the full saved drop-rate curve (including chip behavior), stamina-regeneration curve, damage additive pool, Research EXP additive pool and Kattlekruk bubble/Arcade pool. Character-specific comparisons use the last-active saved character. Other utility comparisons remain direct-source priorities, not a final account-wide combined stat or a global optimum.

Validation: `npm run test:spelunking`, `node test-spelunking-browser.js`; shared engine regression checks in `test-prayer-optimizer.js` and `test-cooking-worker.js`. Model tests cover discount boundaries, caps, automatic vs calibrated costs, Hoard overrides, expected drop rolls, Supply Swap, depth context, tutorial lock, breakpoint batches and non-mutation.
