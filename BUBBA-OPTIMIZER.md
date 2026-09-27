# Bubba optimizer

Added 2026-09-27 as a Bubba subtab. The model reads the imported Bubba arrays directly, with JSON and data/rawData wrappers, and never mutates the export. Catalog values in `bubba-optimizer-data.js` were extracted from the local `audit/N.js` game snapshot.

## Calculation coverage

- Production: effective upgrade levels, additive Meat group, exact game log constants, happiness, weighted dice product, five smoke multipliers, coins, Hustle, gifts, total-level Megaflesh factor, Poppy Crossover.
- Outside production: Vault 65 with Mastery III (89), contiguous Sushi tier unlock count, Jelly Research[7][9] reward threshold, Fountain green index 18 with marbles.
- Prices: paid levels, three Bubba discount upgrades, Rizz, Minehead Research[7][4] reward threshold.
- Optional same-state observed-rate and observed-Megaflesh-cost calibration uses independent multiplicative factors.

## Planning boundaries

Purchase search considers affordable deterministic upgrades, recomputes each step, respects a fixed wallet reserve, and can hold the two cheap Tango upgrades until Spare Coins. Megaflesh mode minimizes a no-happiness, fixed-rate remaining wait locally. Production mode maximizes next-purchase net income over the selected horizon. Search defaults to 500 purchases and is capped at 5,000. Gift pushes default to 1,000 openings with a 5,000-opening limit. Compression groups consecutive upgrades or batches of ten gifts without changing the calculated totals. It is a greedy heuristic, not global optimality or a full time simulation.

Timed training, coin/dice mechanics, new gift choices, and Smoker are separate opportunities. Smoker's one-purchase expected production gain integrates all five quality probabilities and expected quantity. Neither this expected gain nor free-level/coin procs is credited to a deterministic plan.

Push simulation pays each gift cost before its reward, adds purchase happiness, uses the post-purchase total-level multiplier, applies Beeg Slice before Beach Ball/Numbahs, and incorporates per-pat and between-gift decay. Training selection is separate from emulsification. Double pats use the current remaining batch plus one ordinary allowance; a negative used-pat counter preserves the one-time MF8 reserve without doubling it. An expired refresh is normalized to a new hour. A too-short time window rejects the double-pat scenario.

Income during waits/clicks and random outcomes are omitted. Retained dice and smoke are held fixed; Red Die may reduce a retained multiplier, so its result is not a guaranteed lower bound. Successful scenarios stop as soon as the target is unlocked and affordable; they do not perform the reset. A failed scenario does not prove a stochastic or reinvesting route cannot succeed.

The Main header and upgrade prices now use this model for Bubba so they include the same outside bonuses as the optimizer. Other clickers retain their existing renderers.

## Validation

- `npm run test:bubba`: decoding, fresh start, budgets, locks, Tango holds, pats, cap exceptions, delays, calibration, outside factors, and immutability.
- `npm run test:bubba-client`: optional local game-handler oracle audit (requires `../audit/N.js`); 1,890 comparisons of rate, costs, levels, unlock thresholds, traits, gifts, happiness, dice, smoke, coins, pats, and training.
- `npm run test:bubba-browser`: actual imported save, optimizer views, controls, validation, reset, existing subtabs, missing data, mobile overflow, and browser errors. Uses the same Playwright runtime convention as other browser tests.
- Existing clicker performance / bonus-system regressions and static build checked.

## Buy now and Plan ahead

Plan ahead is the default view. It ranks marginal steady production and target-discount benefit per meat, continues beyond the imported wallet, and accounts for lifetime-production unlock thresholds. Rows show Available / Save for, additional meat per step, cumulative additional meat, and the remaining wallet. Buy now keeps the original affordability and horizon rules. Both support 5,000 purchases and compression; grouping preserves the available/future boundary. All 28 board upgrades also appear in a separate next-buy catalog, including actions and upgrades excluded from deterministic ranking. Push simulations use the Buy now state, never hypothetical roadmap funding. Future training, random rewards, and elapsed happiness are not predicted by the roadmap.
