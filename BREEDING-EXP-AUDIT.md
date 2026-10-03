# Breeding EXP optimizer evidence

Formula source: local game client `../audit/idleon-game.js`, checked 2026-10-03.

- ActionBlock GiveBreedEXP: repeat hatch EXP = (2 + TotPetsFound^1.5 * 1.85^eggTier) * BreedingEXPmulti. Discovery/shiny offsets are 10/50, excluded from this repeat-hatch model.
- TotPetsFound sums Breeding[1].
- TotalEggCapacity = round(3 + Breeding[2][2] + GemItemsPurchased[119] + Tasks[2][3][2]).
- Rarity upgrade chance scans occupied slots in order, stopping at first success. Egg tiers cap at 11. Natural event uses (.29+.005*level)^(1+tier), item event uses (.30+.005*level)^(1+tier). Both multiply by (1+.25*level) and achievement 221's 1.1 multiplier. Natural event additionally applies LegendPTS_bonus 32.
- Shattershell Iteration: empty tray after hatch has ceil(12*level^.698)% chance of receiving two normal eggs.

Simulation compares eleven policies: hatch the front egg immediately whenever it meets the target, including bonus eggs; otherwise generate one egg or make one upgrade pass on a full tray. 150,000 opportunities per policy, deterministic seeded randomness. Initial tray is empty. This is a finite sample estimate, not an exhaustive optimal-control result. It does not estimate wall-clock time, the number of egg items, or current saved-tray liquidation. Very rare tiers report small/zero samples explicitly.

EXP multiplier and legend bonus remain manual inputs. Save values seed editable controls and do not mutate account records. Absolute EXP estimates use the entered multiplier; default 1x is a baseline.

Validation: test-breeding-exp.js checks raw/string save shapes, EXP formula, locked tiers, multiplier invariance, and Shattershell yield against its analytic expectation (1+p)/(1-p). Browser test imports a real save, navigates via the Breeding tab, changes rarity, checks mobile overflow and console errors.

## EXP Bonuses subtab (2026-10-03)

The nested Optimizer / EXP Bonuses navigation preserves optimizer form values. The bonus panel reuses Artifact Find Chance’s expandable table, search, categories and hide-maxed behavior. Its worker reads the same bundled account parser as Sailing, with cleanup on tab/page changes and a retryable reference-only error state.

Client BreedingEXPmulti has 11 additive terms: highest talent 372, MainframeBonus 105, meal BrExp, 2 × Breeding[2][0], min(5 × CardLv(w4a2), 50), stamp BreedExp, vial BreedXP, statue 21, 25 × breeding mastery, vote 16 and Vault 59. AllSkillxpMULTI has precisely three factors: Meritocracy 10, Legend talent 20 and companion 32. Ordinary All Skill EXP gear/cards/Bloque are not additional terms here.

Reference levels and names verified against bundled website-data and parsers. TV currently reaches card Lv 7 / six stars (+35%), despite the formula's +50% safety ceiling. Nothing caps at level 100 (+200%). Capachino caps at 13 before vial effects. Breeding Knowledge base cap is 100, with account cap/effect extensions. Skillium starts with a four-level cap and Brown Fever adds up to three. Stamp material caps and statue levels are not permanent limits. Meal caps use the account's current cooking maximum. Jewel, meal, vial and Vault bonus caps retain current account boosters; weekly ballots are conditional, not permanent unlocks.

Acquisition reference for Nest Eggs Stamp: Oinkin’s Diner Deliverer, also verified at https://www.digitaltq.com/wiki/idleon/quests/oinkin-69 . Formula/catalog authority remains the local game client and bundled data. Bonus model tests verify all 14 terms, reconstructed total, boosted maxima, uncapped rows and input preservation. Browser coverage checks nested navigation, worker values, search, filters, hidden maxima, returning to optimizer without resetting inputs and mobile width.
