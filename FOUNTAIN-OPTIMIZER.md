# Fountain upgrade optimizer

Fill timers show full-bar durations both standing in the Fountain and away,
plus remaining durations from `Holes[33]` saved progress. Base requirements are
7,200 / 36,000 / 90,000 for coin / marble / duck bars. Coin speed includes
Fountain Filling and Arcade upgrade 68, using the shared audited Arcade model
for level 101 and companion bonuses. Water Bender applies to all active bars.
Missing timing inputs display Unknown; locked bars name their unlock upgrade.
These are imported-save estimates, not ticking live countdowns.

The Costs currency dropdown filters recommendations and the current water's
upgrade catalogue by payment currency, including Marble for marbleization.
All currencies restores the full list. This is a display filter: original
purchase order numbers, full-plan gains and funding totals stay intact. Done
and Undo work on the same individual steps while filtered.

Recommendations have a Done button that hides only that specific water,
upgrade, purchase type and target level. Undo last restores the last checked
purchase; Reset checklist restores all rows. Completion is remembered locally
for the same account and decoded Fountain snapshot, including refreshes and
goal changes. Changed Fountain save data starts a fresh checklist. This is a
checklist, not a simulated purchase: balances and full-plan gain/funding totals
still refer to the imported save, as labeled on the page.

The existing Hole → Fountain page now reads `Holes[31]` upgrade levels,
`Holes[32]` marble tiers, `Holes[9][30..38]` balances and `Holes[11][81]` marble.
It accepts raw saves and wrapped exports with serialized `data`/`Holes` fields.

Select Fountain currency income (one currency or all enabled types), any of 18
outside-bonus targets, balanced outside bonuses, or marble production. Active/
away and full-capacity settings apply to income goals. Marbleization can be
included or excluded. The default roadmap has 100 purchases; choices extend to
500. `Buy now` stops when the current wallet cannot buy a beneficial upgrade.

Each step picks an affordable purchase with the largest goal gain divided by
the fraction of the payment currency budget spent. When a roadmap exhausts
affordable options, it projects additional funding explicitly. Subsequent
ranking uses original balances as reference budgets (minimum 1 currency unit).
Every shortfall is recorded; a future step is never presented as affordable now.
Logarithmic scores prevent underflow from changing the ordering of very costly
upgrades. Costs, eligibility and gains are recalculated after every step.
Balances are independent and the save is never mutated.

This is a marginal greedy budget heuristic, not a global optimum or a forecast
of currency per hour. It assumes constant currency generation share and ignores
the value of future unlocks, added capacity, royal-stack state, future lucky/duck
rolls and indirect account bonuses. The catalogue retains those upgrades with
their saved levels and prerequisites. Roadmap funding is a stated requirement,
not forecast income. No completion time is claimed.

Outside goals compare the relevant `1 + rounded Fountain bonus / 100` factor.
They do not claim to recalculate the entire account stat or secondary effects
through monuments, caps or unlocks. Minau displays `1 - oldFactor / newFactor`
as the cost reduction. Balanced outside scoring uses the geometric mean of all
18 direct source factors, equally weighted; affected factors are shown separately.
Balanced income uses an equal-weight geometric mean of the currency types
enabled at the start, excluding the save's ignore filter (`Holes[11][83]`). The
game falls back to Bronze when every type is ignored. Individual ignored-currency
goals explain that the player must enable that currency first.

## Formula provenance

Catalog and excluded marble targets were extracted from the supplied local
`app.asar` game client (`audit/N.js`), `HoleFountUPG` and `HolesInfo[76]`, on
2026-09-24. Cost, prerequisites, rounded bonuses, marble tiers, the active fill
multiplier, overflow retention and currency value formulas use that client.
The local client has all 60 upgrades, including Green Water; Red Water remains
a future unlock but its current currency bonus still applies.

Green currency uses the square root of base value × all-currency multiplier ×
desire multiplier. Existing lucky and duck bonuses apply after that root.
Unchanged external factors cancel in percentage comparisons, so the model
deliberately exposes relative gains rather than absolute income rates.
Water Bender's active multiplier applies to the coin, marble and duck bars in
the actual update loop. Marble-production comparisons therefore include it;
Fountain Filling affects only the coin bar. This corrects the stale vendored
parser assumption that the active multiplier only affects coins.

## Validation

`test-fountain-client.js` executes the actual `N.js` Holes2 handler in an isolated
VM. Across 12 varied level/marble states it compares all catalog costs, marble
eligibility, rounded bonuses, branch gates, each of 60 level changes across nine
currencies and active/overflow modes, and marble-production deltas: **30,960
independent comparisons**. Client SHA256:
`49a106e5ea60bd6eb3ec36173b7f43720a2805329d1fe08a4fada822c617165c`.
The audit reads the supplied local client and is not required for a hosted build.

Model tests cover each outside target, balanced scoring, ignored currencies,
500-purchase roadmaps, saved-state immutability, and step-by-step replay of
costs, gains and funding. Browser tests cover all goal modes, 500 rows, Buy now
versus future funding, Minau reduction, and mobile overflow.

Run `npm run test:fountain`, `npm run test:fountain-client`,
`npm run test:fountain-browser`, and `npm run build`.
The browser test uses the same local Playwright installation as the other
browser checks and captures desktop/mobile images under `audit/`.
