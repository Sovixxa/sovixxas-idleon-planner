# Account Review planning

Account Review now contains a shared-budget purchase planner, character combat diagnostics, connected optimizer actions, and permanent-upgrade spending recommendations. Sampling lives in Construction's Sampling subtab.

## Spending model

The worker clones the export, deducts each supported purchase, reparses the account, and recomputes the selected character metric. Each iteration compares up to 16 goal-ranked candidates. The user can prioritize gain per fraction of the starting resource budget or largest immediate gain. This is a bounded greedy search, not an exhaustive optimum. The percentage budget applies separately to every starting currency; it is not a currency exchange rate.

Supported payments include coins, storage materials, Alchemy liquids, meals, Summoning essence, Fountain currencies, particles, Gold Balls and Royal Balls. Inventory materials are deliberately excluded from joint spending. Stamp cap payments are evaluated with the first newly available coin level as a bundle, and reset the Hydrogen reduction counter. Longer prerequisite chains and free loadout changes are outside the purchase search. Imported saves are never modified.

Permanent recommendations cover owned vials, Salt Lick, the built Atom Collider, unlocked Vault upgrades, and owned Arcade bonuses in the saved shop rotation. Missing balances, unknown prices, locked upgrades and caps suppress recommendations. Relevant player-stat previews reuse the account engine. Source-bonus summaries retain current multipliers; combined character previews reparse all multipliers.

Vial quantity thresholds, Salt Lick prices and Arcade price branches were checked against the locally extracted game client in `../audit/cog-client-readable.js`: `AlchemyVialQTYreq`, `CauldronStats("VialCosts")`, Salt Lick purchase handlers, and `DungeonCalc("ArcadeCost")`. Arcade level 100→101 uses five Royal Balls. Atom and Vault costs use the existing vendored parsers. No live price or rotation is inferred beyond the export.

## Connections and diagnostics

Research supplies reachable one-point EXP improvements. Land ranks supplies the next evolution point from the existing optimizer. Prayer suggestions compare one equip/remove change with the saved combat setup, including curses. Shiny collection compares supported collection setups against ready traps; Fenceyard actions require an owned stored shiny and a usable slot, using the existing tier planner. These are separate from the spending search.

Combat diagnostics use hit chance, survival and the saved map's base respawn ceiling. Related funded purchases are candidates, not promises that a single purchase fixes the problem. Damage still affects multikill above the base kill ceiling.

Material time estimates divide missing storage materials by gross current printer output and explicitly exclude spending, storage caps and atom conversion. Refinery rank-bar estimates require enough saved inputs for the projected cycles. Missing rates remain unavailable. These are snapshot estimates, not live timers.

## Sampling

The Sampling subtab lists imported samples and current slot output. A user-entered, in-game AFK resource rate is multiplied by the selected character's saved sample rate (capped at 90%). The fresh-output estimate removes the existing Legend Talent age factor from the slot multiplier. It is not an automatic skill-resource simulation, and the entered rate must match the imported sampling setup. The comparison describes that slot; resampling can also affect other printer outputs and temporary effects.

## Checks

- `node test-review-planning.js`: shared balances, reserves, repricing, cap bundles, different currencies, permanent prices, diagnostics, ETA and sampling arithmetic.
- `node test-review-budget-integration.js`: real export, multiple sequential damage purchases and save purity.
- Existing Account Review action, impact, ranking and browser tests cover the expanded adapters, worker imports, budget controls and Construction Sampling navigation on desktop/mobile.
