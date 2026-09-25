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

## Follow-up: lists stopping with Amber remaining

- Default is now Buy now / Until budget is spent. Numeric purchase limits remain available for roadmaps. Budget mode stops at the cheapest unaffordable useful batch, no modeled improvements, or an explicit 50,000-purchase safety limit. The page shows projected remaining Amber and the stop reason; goal filtering can legitimately leave funds for other goals.
- Fixed exclusion of level -1 upgrades. The real client permits visible -1 to 0 unlock purchases and charges the undiscounted-form base (with account discounts), not the regular 0.25 × exponential formula or level surcharge. Recommendations now include ordered prerequisite unlock chains and their costs before the first beneficial level. Cyclic or invalid chains are rejected and partial unfunded batches are excluded.
- Fixed Use calculated discounts: it now restores the saved automatic multiplier instead of setting it to 1.
- Independent oracle test executes the supplied client's actual Spelunk handler: 6,528 cost/visibility comparisons across all 68 upgrades, -1/0/1/30 levels, first-character skill 0/49/50/508, Sushi alternatives, cooking, Jelly and Hoard. Run npm run test:spelunking-client (requires local audit/N.js; not shipped).
- Sample save did not reproduce exactly 100M left from 360M; that reported amount remains unconfirmed without the same save/settings. These are verified defects and clearer termination behavior, not proof that every leftover balance is a discount error.
