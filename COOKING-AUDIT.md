# Cooking and NMLB

Verified against the installed client `../audit/N.js`, 2026-09-20.

- `CookingR("CookingMenuMealCosts")`: saved level cost, level-111 cost wall, achievement 233, Dream[11]/OptionsListAccount[193], cloud 33, companion 162 (normal and upgraded).
- `Meals[0]`: levels; `Meals[1]`: cooking work toward the next produced meal; `Meals[2]`: available meals. MealINFO[][1] is work per produced meal.
- `CookingR("CookingMealMaxLVlol")`: base 30 + Causticolumn artifact tier × 10 + Emporium 20/21 (10 each) + Spelunk[0][5] lore (30) + min(20, Grimoire[26]).
- Daily NMLB: Emporium 16 adds one level, BundlesReceived.bun_s adds two. One target per trigger, not one target per gained level. Eligible level >=2 and below cap; <= comparison picks highest index on tied levels. Forecast simulates independent copies of saved levels.
- Kitchen ladles advance every kitchen by 3600 × (1 + talent 148 bonus/100) seconds per ladle.

## Estimate limits

Full CookingSPEED has many live and character-dependent multipliers. This page does **not** reconstruct it. The user supplies combined in-game cooking speed for the kitchens they intend to assign to a meal and their active character's Overflowing Ladle bonus. Estimates project that setup onto each individual meal, using current stock/work and fixed speed. They do not assume every listed meal is produced simultaneously, or simulate future speed gains, daily discounts or NMLB upgrades. No made-up default speed is used.

Companion data comes from export root companion.l and borrowed companion IDs in OptionsListAccount/OptLacc[606]. Missing companion or discount records are labeled. Incomplete cap/unlock data blocks the NMLB forecast until sufficient data/cap confirmation exists. Estimate inputs stay with the imported save object during navigation and reset on reload/new import.

Validation: test-cooking.js covers serialization, export alias, missing data, forecast order, no save mutation, paid bonus, cap clipping, level-111 wall, stock/progress subtraction and whole-ladle rounding. Browser checked using loaded account: 74 meals, cap160, Giga Chip107→108 next, two meal pages, numeric estimate inputs and compact forecast.
