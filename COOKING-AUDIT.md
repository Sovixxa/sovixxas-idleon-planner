# Cooking and NMLB

Verified against the installed client `../audit/N.js`, 2026-09-20.

- `CookingR("CookingMenuMealCosts")`: saved level cost, level-111 cost wall, achievement 233, Dream[11]/OptionsListAccount[193], cloud 33, companion 162 (normal and upgraded).
- `Meals[0]`: levels; `Meals[1]`: cooking work toward the next produced meal; `Meals[2]`: available meals. MealINFO[][1] is work per produced meal.
- `CookingR("CookingMealMaxLVlol")`: base 30 + Causticolumn artifact tier × 10 + Emporium 20/21 (10 each) + Spelunk[0][5] lore (30) + min(20, Grimoire[26]).
- Daily NMLB: Emporium 16 adds one level, BundlesReceived.bun_s adds two. One target per trigger, not one target per gained level. Eligible level >=2 and below cap; <= comparison picks highest index on tied levels. Forecast simulates independent copies of saved levels.
- Kitchen ladles advance every kitchen by 3600 × (1 + talent 148 bonus/100) seconds per ladle.

## Estimate limits

Cooking speed is calculated in cooking-worker.js from the imported save through the local Toolbox parser. Each character uses their own cooking star sign and farming-level contribution. The default is the character with the highest combined kitchen speed times Overflowing Ladle multiplier; the user can select another character or override speed and ladle bonus manually.

Client references rechecked on 2026-09-24: CookingR("CookingSPEED") includes kitchen upgrades, talents, meals, alchemy, stamps, lab, farming, artifacts, cards, summoning, vault, cavern and Button bonuses. Ladle consumption adds 3600 * (1 + GetTalentNumber(1,148)/100) seconds.

Next-level ladles = ceil(max(0, remaining meals * meal work requirement - saved progress) / combined hourly kitchen speed / (1 + ladle bonus/100)). Remaining meals is max(0, ceil(discounted level cost) - saved stock). All unlocked kitchens are assumed reassigned to each meal independently. Estimates hold speed fixed and exclude future speed gains, free daily levels, and changed character setups. Very large ladle counts are shown without an artificial cap.

Companion data comes from export root companion.l and borrowed companion IDs in OptionsListAccount/OptLacc[606]. Missing companion or discount records are labeled. Incomplete cap/unlock data blocks the NMLB forecast until sufficient data/cap confirmation exists. Estimate inputs stay with the imported save object during navigation and reset on reload/new import.

Validation: test-cooking.js covers serialization, export alias, missing data, forecast order, no save mutation, paid bonus, cap clipping, level-111 wall, stock/progress subtraction and whole-ladle rounding. Browser checked using loaded account: 74 meals, cap160, Giga Chip107→108 next, two meal pages, numeric estimate inputs and compact forecast.

2026-09-24 validation: test-cooking-worker.js checks the sample export, effective ladle talent level, all-character finite speeds, whole-ladle rounding, available stock, missing data, and no save mutation. Browser verified automatic worker results, two-column meal rows, character switching, formula details, search and narrow viewport overflow. Shared engine rebuilt from source.

## Secondary preset and bonus audit (2026-09-24)

The previous giant estimate reflected Blood Marrow level 1 in the active saved preset. SLpre_7 contains level 305. Talent records may be numeric-keyed objects, not only arrays. The worker now simulates switching the full secondary Voidwalker preset, reparses dependent bonuses, and offers both scenarios without mutating the save. It defaults to the scenario with the highest ladle output, with an explicit instruction to switch the named character and preset in-game. No maximum-book-level substitution is used. Sample Turkey estimate is 8 ladles with preset 2 versus 9.657e53 with preset 1.

The CookingSPEED factor list was compared with the installed client. It includes Blood Marrow, Enhancement Eclipse/Super Chow, Crop Depot, event shop, Richelin, ballot, vault, Marshmallow, Diamond Chef with Prisma applied BEFORE exponentiation by diamond meal count, Void Plate Chef, MSA superbit, kitchen speed upgrades, Triagulon, Button, arcade, three cooking vial groups, stamps/Lab jewel, cooking meals, star sign, Summoning rewards, Monument, Schematic, passive card, Lamp, Amethyst, Troll/achievements, and Cabbage. All first-kitchen factors reconcile to the calculated speed. Farm scaling and cooking star sign use the selected ladle character.

The shared Prisma helper omitted JellyOperation RoG_BonusQTY(36): Research[7][9] > 36 gives +1 percentage point to Prisma before its 4x cap. Added it and corrected the upgraded companion breakdown to show its actual contribution. The sample has not unlocked that Jelly reward, so it does not explain the sample's large discrepancy.

Meal speed meal bonuses include mastery, ribbons, Lab, shiny pets, companion and Summoning meal multipliers. The UI exposes all kitchen multipliers, each cooking-related meal contribution, and Prisma sources. Tests independently verify the Blood Marrow and Diamond Chef exponents, Prisma unlock boundary, meal contribution sums, and reductions when Summoning, Crop Depot, Prisma or direct meal speed is removed. Cooking, Golden Food and prayer regression tests and browser preset/8-ladle/mobile checks pass.

## Mastery point planner (2026-09-24)

Cooking Mastery subtab has yellow meal and purple flavor rankings. Yellow defaults to marginal combined kitchen speed; it projects the full amplified meal contribution into Mcook, KitchenEff and zMealFarm pools for every kitchen. An alternate view ranks the relative gain to each meal's own bonus without claiming cross-stat account utility. Unspent-point suggestions greedily recalculate after every point; no save allocations are changed.

Yellow formula BonusMultiCook = 1 + p/(p+5): extra-bonus milestones at 5/20/45/95 points give 50/80/90/95% of its asymptotic extra +100%. Next-point relative own-bonus gains fall below 1% at 12 points and 0.1% at 46. These are explicitly labeled practical soft/shadow thresholds, not game hard caps. Purple EXP categories rank by slope/(1+slope*p); suggestions exclude locked categories and Smoky. Smoky rank chance is 250*b*p/(25+b*p); guaranteed-rank breakpoints at 100% and 200%, asymptote 250%, ribbon maximum 25.

Verified client Summoning2 branches: mastery unlock uses Rift[0] > 58 OR companion 87; displayed rank = saved mastery level + 1; category thresholds 0/1/5/10/25/100 correspond to displayed ranks 1/2/6/11/26/101. EXP growth becomes 12.5x per saved level after 40. PtsLeftCook_P includes Jelly obstruction reward 13 and PtsLeftCook_Y includes reward 5 (+1 each, strict obstruction > index); fixed both omissions in the parser. Unused thresholds 150/250/500 do not unlock additional categories.

Validation: test-cooking-mastery.js checks mathematical boundaries, real-save point budgets, locked flavors, allocation budgets, and independent full-kitchen recalculation parity for yellow point gains. Browser checks cover Mastery tabs, goals, recommendations, responsive overflow and returning to the meal optimizer.

## Interactive Mastery calculator

Added name/effect search, editable yellow and purple point allocations, editable simulation budgets, clear/reset controls, and live saved-versus-test meal bonus, kitchen speed, mastery EXP and ribbon chance previews. Full meal effects are exported by the worker; PxLine is kept independent of mastery to match the existing formula. Point edits are isolated UI state and never change the imported save. Locked purple flavors cannot be edited. Over-budget plans remain visible but are marked explicitly.

The overall-account starting setup reallocates the full yellow budget from zero. It greedily scores weighted log gains to pooled meal-stat contributions; default weights are 3 for golden-food bonus, 2 for cooking-speed stats, and 1 otherwise. These are visible, adjustable priorities, not an assertion of universal account-optimal weights. A zero priority excludes a meal. The recommendation and live meal effects are not a full downstream damage/gold-food simulation. Calculator budgets are limited to 2,000 points for responsive local testing, not as a claimed game cap.

Validation covers exact budget use, Yumi allocation/exclusion, preserved simulated allocations, preview gains and imported-save immutability; browser checks cover search, edits, loading recommendations, weights, resets, over-budget state, purple allocation, empty searches and mobile width.

## Yumi-first and compact mastery revision

The account setup now reserves a deliberate Yumi allocation before distributing the remainder. Default target 20 points gives 1.8x Yumi's meal contribution (80% of the possible extra bonus); alternative targets 5/12/45 are available. For budgets greater than one, at least 20% remains for other meals. The allocator never tops Yumi back up after reaching this target; exclusion is honored. Remaining eligible meals use explicit P1/P2/P3 weights 3/2/1 with gold/purple/blue borders. These are user-adjustable heuristic priorities, not an asserted globally optimal conversion between account stats.

Replaced the long table and expanded explanations with six-row pagination and collapsed help/recommendation panels. Input edits preserve scroll and focus; search resets the page. The top expandable setup summary compares each allocated meal-stat pool against zero yellow mastery and lists the contributing meals and points, for saved/test/recommended allocations. Purple effects are also shown; the recommended-yellow view labels purple as the calculator allocation. Downstream final character stats are not claimed.

Tests cover the sample's 20 Yumi / 18 remaining split, smaller-budget reservations, exclusion, golden-food meal-pool gains, border changes, page navigation, summary mode switching, scroll stability, responsive width, and purple allocation controls.


## Overall-account shortlist revision (supersedes earlier priority defaults)

The previous fallback assigned P3 to every unrecognized effect, causing low-value spending. Overall now uses an explicit whitelist: P1 golden food, Research EXP, Minehead currency; P2 skill efficiency; P3 jade. Every other stat defaults to zero, including future unknown stats, library checkout, liquids, sailing, Banana, and essence. Manual opt-in remains possible; opted-in essence stays capped at one. Cooking profile now also uses an explicit cooking-speed shortlist.

Default Yumi target is 10 (1.6667x), adjustable to 5/10/12/15/20/45; the existing budget reservation still applies. Remaining allocation maximizes the stated weighted log meal-pool objective with discrete diminishing marginal gains, not a claimed conversion of unrelated stats into total account power. Locked or zero-contribution meals are excluded. The imported 38-point recommendation: Yumi 10, Giga Chip 9, Divorce Cake 9, Whipped Cocoa 4, Riceball 2, Corn 1, MrLoin Steak 3.

Community guidance checked: https://www.reddit.com/r/idleon/comments/1tzfrtg/priority_list_for_yellow_cm_points/ and https://www.reddit.com/r/idleon/comments/1vng1a9/cooking_mastery_sour_unlock_is_so_freaking_awesome/ support limited Yumi investment, research, efficiency, and Minehead currency. These inform preferences; the local multiplier formula supplies actual gains.

Validation: mastery regression tests cover shortlist isolation through 2,000 points, unknown effects, locked Minehead, manual opt-in, essence cap, full budget use, and save immutability. Headless browser verifies the default target, loading recommendations, search, and zero library/liquid allocation. Cooking and worker tests pass.


## Live account impact beside mastery bonus

Golden food uses the selected character/preset's full golden-food multiplier, replacing only the simulated meal contribution through the existing outer multiplier. All-character edited-export parity is tested. Other supported full impacts include total kitchen speed and Minehead currency/hour. Minehead scales the saved hourly rate by the changed shared Research Grid 147 + 166 + meal bracket, preserving all other account factors. Edited-export tests at 0/1/4/9/20 points match the full parser. Example at four Divorce Cake points: 1,267,474.33095/hr -> 1,528,977.85667/hr (+261,503.52571/hr). Missing full-account data falls back to explicitly labeled meal contributions; locked zero income stays zero.

Impact displays saved/test, absolute change, relative gain, and next-point preview beside the existing meal bonus. Browser checks verify live edits, full comma-separated currency amounts, side-by-side layout, and no overflow at desktop/mobile widths. No imported save is changed.


## Full-account mastery previews across meal effects

A dedicated cooking-impact worker reparses cloned exports for the full simulated yellow allocation and each visible next-point preview. Baselines are tied to the selected character and actual saved/secondary preset; response keys prevent an older allocation from overwriting the newest one. Shared meal pools and indirect changes through other meal stats are included. Calculations are cached and run outside the UI thread.

45 of the 48 distinct effects have account outputs: damage/accuracy/defence/critical chance, efficiency/prowess, money, research and Minehead hourly income, jade per successful find, skill EXP bonuses, gaming and essence multipliers, breeding, egg times, lab width/VIP, library checkout times, liquid capacity, sailing capped speed, crop chance, cooking/recipe rates and upgrade costs, refinery cycles, and spelunking power/amber/upgrade cost. Context labels specify the selected character, boat 1, plot 1, or next upgrade where relevant. Tower defence shows the full points multiplier; kill-specific totals need the live wave/enemy. Existing traps cannot be recalculated as if newly placed. Pet damage needs the combat formation and active abilities; the current engine has no Spelunking EXP formula. Those three effects display explicit unavailable reasons instead of claiming a meal percentage is an account total.

Gaming EXP was incorrectly reading BrExp; the local client GamingExpPCT reads GamingExp. Corrected the lookup and added a regression check. Essence uses the client's SummRockEssGen shared SumAllEss chain including summoning, lamp, gambit, gem purchases, charm, fountain, monument, rift, upgrades, bubble/meal/MSA/slab, achievements and ballot. Skill-specific EXP outputs use their native units; cooking returns a multiplier.

Validation: test-cooking-impact.js covers all 45 supported effect types, explicit missing contexts, full export parity for research/currency/efficiency, shared contributions, secondary Blood Marrow, mastery reset, prowess/sailing caps, and immutable input. Browser uses the real worker and verifies research edits, switching to efficiency, no stale output, mobile width and no page errors.


## Jade correction

The previous jade helper omitted the selected Sneaking Mastery floor scaling, as well as multiple account modifiers. Local client initialization applies 0.1 * NinjaInfo[10][floor] * NinjaInfo[10][11]^mastery only when selected mastery is nonzero. The client constants for floor 10 and mastery base are 15,000,000 and 60,000,000. The sample uses mastery 7, producing 4.19904e60 base jade rather than 15M.

Replaced the truncated gain chain with the client Ninja("coin") factors: gem shop, combined belt bracket, monument, Treat Sack, Jadevalanche, Gold Coin, Killroy, shared vial/meal/card bracket, equipped charm bracket, slab/stamp, crops, Summoning, MSA/sigil/arcade/vault, star sign, W6 merit, skill mastery, compass, companion, achievements, Malachite, Meritocracy, Snapegrass, and Gold Envelope. Retained the current parser's Sushi modifier. Charm slots include Gold Scroll and symbols before the solo multiplier. Client zero-detection Shiny Smoke factor is 2, not 3.

The UI explicitly reports per-successful-find jade and selected mastery; this is not the optional in-game hourly display, which also uses action speed, detection and knockout time. Imported LumbaJacker yields 1.005359536e96 per find. User reports approximately 1e94 from the live game; exact parity remains unconfirmed without matching character, floor, save and display units. Do not calibrate the formula to that rough number.

Tests: client constant/mastery ratio at 0/6/7, Malachite and Gold Envelope removal, additive belts with individual symbols, isolated meal bracket, immutable save, full mastery integration, and build pass.
