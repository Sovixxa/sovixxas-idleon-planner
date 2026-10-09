# Account Review target calculators

Audit date: 2026-10-09. The existing Drop Rate calculator is retained. The other eight goals use `review-target-{metrics,sources,model,worker,ui}.js` and the same compact result styles.

## Targets and interpretation

There are 51 distinct metrics, with some available under multiple goals.

| Goal | Targets |
| --- | --- |
| Account growth | Active printer output, kitchen speed, Research EXP rate, character Construction base build rate, Gaming bit multiplier, Spelunking power, total class levels, Divinity points |
| More damage | Maximum character damage with the saved map, equipment and talent preset |
| Bigger samples | Sampling percentage, sample size at an entered measured resource yield, active printing output, Mining efficiency, shared all-skill efficiency |
| Faster cooking | Kitchen cooking speed, recipe research speed, Cooking efficiency, Cooking AFK percentage |
| AFK gains | Saved-target kill credit and nine activity-specific AFK percentages |
| Skilling | Mining/Lab/Cooking/Spelunking efficiency, shared efficiency and prowess, eight skill AFK percentages, Divinity points |
| More EXP | Class EXP, eighteen skill-specific EXP values, Research EXP rate |
| Permanent unlocks | Collected stamps, discovered vials, discovered meals and owned cards |

Units are deliberate. Gaming EXP is a percentage bonus. Sneaking uses its multiplier rather than multiplying in the floor's base EXP. Divinity's existing getter returns points, so this is offered as points, not mislabeled EXP. The fixed 100% Divinity AFK component, 90% sampling component and 10% shared prowess component do not imply that the account is maxed.

Sampling is not an invented resource-yield model. The sample-size calculator uses an explicit measured yield and the effective sample percentage. It does not project Chopping/Fishing/Catching efficiency, resource difficulty, speed, multi-resource procs or active snapshotting into a new yield. Active printing retains recorded sample sizes. Construction targets the character’s base build speed; the saved cog-board total is only a reference because its character-cog values already contain baked account multipliers. Those limits appear in the relevant metric notes.

Permanent-unlock targets are catalogue counts with conditional acquisition requirements. Stamp targets reuse Account Review’s existing acquisition exclusions: only actual owned stamp items or verified active regular quest routes enter a route; unavailable stamps and rare random rewards remain excluded. They are not a claim to simulate every Rift, quest, automation or world-unlock prerequisite. Existing Account checks retain the broader progression/unlock review.

## Simulation and source coverage

The planner clones the export and changes verified save paths. Each independent scenario and each accepted cumulative route step is fully reparsed. STR/AGI/WIS/LUK are reconstructed; Construction is refreshed afterward. Independent gains are never summed to obtain a combined projection. The user's imported save is not modified.

Source discovery enumerates mechanics rather than matching effect-description keywords. A source with no direct damage wording can therefore help through primary stats, meal multipliers, food capacity, mastery or another shared amplifier. The supplied eleven-character fixture produces **1,465 bounded candidate milestones**. Counts differ by account, character and target type.

| Family | Save mapping / constraints |
| --- | --- |
| Stamps | `StampLv`/`StampLevel`, paired material cap; explicit hand-in then coin levels |
| Vault and Arcade | `UpgVault`, `ArcadeUpg`; unlocked/active entries and native caps |
| Bubbles, vials, sigils | `CauldronInfo`, `CauldronP2W`; bounded bubble milestones, level-13 vial mastery, sigil tiers |
| Meals, ribbons, mastery, kitchens | `Meals`, `Ribbon[28+i]`, `CookMaster[0]`, `Cooking[i][6..8]`; current caps, extra points/food requirements, unlocked kitchens |
| Salt Lick, Atoms, prayers, Post Office | Native paths/caps; collider gate, saved activation, prayer bonus and curse, additional boxes |
| Class and skill levels | `Lv0_id` plus the `PVStatList_id[4]`/personal-value level snapshot for class levels; all roster providers, next 25-class/10-skill milestone; no automatic talent-point allocation |
| Talents and Legend talents | `SL_id`/`SkillLevels_id`, `Spelunk[18]`; allocated talents, saved book/point caps, all roster providers |
| Grimoire, Tesseract, Compass | Native upgrade paths and caps; unlocked or owned upgrades |
| Spelunking shop and chapters | `Spelunk[5]`, `Spelunk[8][4*chapter+i]`; owned entries, bounded progression, pages, artifact amplification |
| Research and observations | `Research[0]`, `Research[4]`; selectable/owned squares, found observations and Insight progression |
| Equinox, Land Rank, Farming | `Dream`, `FarmRank`, `FarmUpg`; current gates; ordinary Market starts at raw offset **2** |
| Shiny pets, artifacts, shrines | Native progress; shiny time, artifact-tier access, saved shrine applicability |
| Bribes and cards | Conditional bribe acquisition; owned-card natural star thresholds; saved cards/sets/chips remain fixed |
| Statues, Royal statues, Hole measurements | Verified deposit/enhancement paths; highest statue provider, existing tiers, explicit materials |
| Beanstalk and Gallery | Existing stalk ranks with additional food deposits; owned stored trophy moved to an empty unlocked podium, removing its storage copy |
| Summoning and Fountain | Native optimizer unlock checks and next-level mappings |
| Other progression | Reuses audited Drop Rate counter mappings such as Endless, Emperor, Jelly and Gallery amplification; reconstructs primary stats rather than keeping DR's saved-Luck assumption |
| Golden food and capacity | Every verifiable equipped golden food; explicit farming/refill. A capacity upgrade refills only when loading capacity actually grows |
| Nametags | Owned next-grade scenarios; separate gem-shop/time-gated section, excluded from route and projected total |

The expandable system audit also identifies setup/acquisition scope: equipment/tools/stones/sets, card-set and chip changes, Lab connections/jewels, deity links, companions, signs, obols, achievements, merits, guild and weekly selections, progression collections and temporary effects. Their saved effects participate in native formulas. Not every possible acquisition, roll, layout or prerequisite chain has a numerical candidate; these are explicitly manual review rather than silently assumed free upgrades.

Candidates are milestones, not maximum levels or affordability recommendations. Costs, material inventories, point totals and farming time are not shared-budget optimized. Requirements accompany each step. Further milestones may still help even if this bounded pass cannot reach the target. Very small improvements remain in comparisons; a route skips gains below 0.01% unless they reach the target. Setup and paid acquisition are never silently applied.

## Game-client formula audit

Evidence comes from the locally available game client `../audit/N.js`, the vendored native formulas and the existing independent formula audits. Relevant client branches include `SkillStats` (`AllSkillxpz`, `AllSkillxpMULTI`, individual skill EXP), `Ninja` EXP/charm effects, `SummEXPgain`, `SpelunkingExpMulti`, kitchen Marshmallow, and card stat effects.

Corrections made during this work:

- Restored the separate Meritocracy × Legend × companion skill-EXP multiplier. Kept it separate from additive skill EXP and inside native floors where applicable. Smithing, Alchemy, Construction, Sailing and Gaming intentionally do not receive this factor.
- Corrected Mining's Ballot index; added Lab mastery, Legend and Sushi factors; corrected Farming's use of the shared multiplier; added Summoning's companion factor.
- Replaced Sneaking's zero charm placeholders, corrected its Compass index and included Admiring the Art, Vault, Gold charm amplification, symbols, solo-floor charm multipliers, EXP-blocking charms and the talent's Y multiplier. Retained base EXP separately from the displayed multiplier.
- Added Spelunking EXP: mastery/exotic/cards/chapters, Killroy/Arcade/shop, shared skill EXP, food/meals/stamps/statues, additive skill EXP, talent Y and armor-set factors, followed by the separate Gambit addition and final floor.
- Corrected additive skill EXP to use the Flurbo class-EXP upgrade and include the friend bonus.
- Corrected reconstructed primary-stat card lookups to use equipped cards.
- Applied the selected character's Farming level to kitchen Marshmallow, matching the game and existing Cooking impact audit.
- Corrected Farming Market upgrade paths to `FarmUpg[i+2]`, synchronized both class-level save representations for family providers, and stopped treating baked Construction cog rates as a live progression metric.

These corrections do not assert that every game formula or future release has been exhaustively proven. The calculator exposes source evidence and scope rather than claiming universal completeness. Lab's legacy `real` field is not used by these target metrics; the displayed Lab EXP metric uses `value`.

## Layout and execution

Every goal retains the Calculator subtab. The character dropdown defaults to **Account Wide**, including Drop Rate. Character-dependent targets show separate, collapsed routes for each eligible character; these are independent projections, so shared upgrades can repeat and are not a combined spending plan. Shared account metrics are counted once. Characters without an applicable saved activity or active printer output are explained under exclusions. Measured sample yields require an individual character. Results share the DR current/projected/target summary, compact upgrade rows, closed requirements and source/system audits. Long routes show ten steps initially; comparisons are searchable and paginated twenty at a time. Mobile controls fit two columns. Collection/count targets omit unrelated families and nametag sections.

The worker compares sources off the UI thread, reports progress and supports cancellation. A completed individual-character scan caches that character's other ordinary metrics. Account Wide groups identical raw upgrades across the roster and evaluates only the requested metric; per-character food refills still receive their own full recalculation. Choosing an individual character afterward reuses the completed comparisons. A fresh save invalidates the retained worker. Input changes clear stale projections; navigation terminates in-progress work. A full uncached audit can take several minutes on a large account.

## Verification

- `npm run test:review-target`: all 51 baseline metrics, raw mapping/caps, scenario replay, collection acquisition, primary stats, food-capacity dependencies, combined route replay, cross-metric caching, save immutability, formula regressions and real browser navigation through all eight goals.
- `node test-review-target-scan.js [shard] [shards]`: optional exhaustive reparse of every fixture candidate against all non-measured, non-collection metrics, with machine-readable results under `../audit/review-target-scan-*.json`.
- Existing Account Review model/impact/browser, Cooking impact, connected stats/pools/traces, Breeding EXP bonuses and Drop Rate model/browser regression suites.
- Static build checks asset references and versions the worker import graph with the release.

The exhaustive pass completed 1,465 scenarios × 46 numerical metrics (67,390 evaluations) without a calculation error. The zero-gain review afterward exposed the Construction snapshot limitation and the separate family-level cache. Focused follow-up tests cover the corrected Construction target and all eleven class-level scenarios across the numerical metrics. The completed collection cap and the seven unavailable/two random stamp exclusions have separate regressions. All eleven characters were checked across all 51 metrics: 560 valid totals and one expected non-fighting kill-credit guard.

Browser screenshots are stored at `../audit/review-target-desktop.png` and `../audit/review-target-mobile.png`. They are local validation artifacts, not included in the deployed site.

## Calculator performance (2026-10-09)

- Account Wide groups candidates by their complete raw mutation, including level snapshots, caps and inventory patches. The shared parsed account is transient; per-character golden-food refills and cumulative interactions remain exact. Independent zero-gain options remain compared and can still contribute after earlier steps.
- Quiet simulations bypass trace instrumentation using the original generated function bodies. Source-audit calculations retain tracing. Stamp capacity is reused only within one update and bag type; library schedules reuse their fixed multiplier within one call. No source family or parser pass was removed.
- Drop Rate keeps a bounded cache of 256 exact raw-scenario projections, shared across characters and subsequent targets while its calculator remains open. It stores scalar rates, meal limits and food state, not hundreds of full parsed accounts. New imports and cancellation discard the worker.
- A bounded native 11-character benchmark (Mason Jar, golden food, class/family levels and nametags) fell from 135.77 s to 49.45 s (2.75×), with identical option values, patches, food refills and cumulative routes. Full native account output also matched before/after with a fixed clock. This is a representative subset benchmark, not a timing guarantee for all 1,465 candidates.
- `npm run test:calculator-performance` verifies native roster option parity, food dependencies, shared comparison counts, numeric/string character cache keys, repeat-target reuse, cold/shared Drop Rate parity and import immutability. Existing DR comparison tests now use an unmet target so the already-reached fast path does not bypass the assertions.

## Quick plans (2026-10-09 follow-up)

The Calculator now defaults to a quick plan: approximately six seconds of independent comparisons followed by a four-second cumulative-route budget, shared across the eligible roster. Budgets are checked between complete simulations, so a running formula/group can overrun them. Families are interleaved and likely relevant names are prioritized; this changes ordering, never eligibility or native gain formulas. Every reported step is an exact cumulative projection.

Quick results explicitly say when comparisons or route construction are unfinished. They are not evidence that an account is maxed or that all upgrades were tested. The full bonus-source audit remains visible. Continue quick scan retains earlier comparisons and adds more; Full comparison checks the remaining catalogue and builds an unbounded route, reusing completed comparisons. The full mode remains slower and is optional. Nametag results remain separate and partial coverage is explicit.

The full-catalogue Account Wide damage browser test returned in 11.264 seconds on the fixture, versus waiting for the exhaustive scan. This measures a partial quick plan, not a faster exhaustive audit. Tests verify continuation, optional full cancellation, time-budget behavior, exact route replay, full comparison resumption with no repeated candidates, and equality to a cold full result. Run npm run test:review-quick.

## Account Wide scope correction (2026-10-09)

Account Wide now means shared account sources, not one target route per character. For character-dependent metrics it lists shared purchase/upgrade milestones once and shared setup guides, with no invented account total or numerical gain. The target controls are disabled until a character is chosen. Character equipment, food stacks, personal levels, talents, post-office allocations and equipped-card upgrades are excluded from this view. Shared totals (Research, Gaming bits, Spelunking power, total account levels and collection counts) remain calculable once. Drop Rate follows the same shared-sources/character-target rule and keeps nametags separate. Source milestones are not assertions that every listed source affects the currently selected metric; that is verified in the character calculation.

Calculator requirement values of a billion or more use compact scientific notation. Requirement cards also wrap oversized tokens on mobile. The shared-source browser test checks the Turkey of Thank meal costs and the absence of character panels, while existing calculator browser tests now verify the clarified scope selection.

## Metric relevance and shared hourly targets

The generic candidate catalogue is no longer rendered as a metric’s source list. Character-dependent account overviews show deduplicated shared inputs observed in that metric’s native formula breakdown. Recommendations and verified system rows show positive simulated gains only; the optional comparison toggle can reveal reductions, never unrelated zero-gain upgrades. Zero-gain scenarios remain internal to cumulative calculations because real interactions can make them useful later.

Cooking speed, recipe research speed and active printer output support Account Wide numerical targets. Kitchen totals use native account-context cooking formulas once (not a sum of per-character kitchen totals). Printer output sums all active saved prints, including different resource types. Shared routes keep personal food/equipment fixed and restrict purchases to account upgrades, passive cards and explicitly shared cooking talent providers (Blood Marrow / Enhancement Eclipse). Native source lists still expose context and formula limits.

Regression checks compare these hourly totals to native formulas, prove Cooked Meal Stamp improves cooking while Sailboat Stamp contributes zero and never enters the route, replay the combined raw patches, inspect 39 character-dependent source views, and type/run an Account Wide cooking target in the browser. Existing navigation checks cover all goal tabs.


## Account Wide shared-upgrade plans

Account Wide now runs one plan filtered to shared purchases; it does not return a source catalogue or independent character plans. Genuine account totals retain their native units. Character-dependent metrics use a percentage-improvement target: each eligible saved setup has equal weight in the mean of relative changes from the current save. This is explicitly labelled as an improvement from shared upgrades, not a universal account stat or hourly rate. Personal loadouts and food stacks stay fixed; no automatic refill patches are applied. Shared talent providers remain eligible where their effect is an account bonus.

Each combined route is reparsed and recomputed against the original baseline; independent gains are never added together. Neutral shared comparisons remain available internally for interactions. Changes below 0.01 percentage points remain in comparisons unless they finish the target. Drop Rate in Account Review and Loadouts uses the same scope and target controls. Measured sample size remains an individual measurement; select a character for that metric.

Regression checks cover shared-only raw patches, exact cumulative percentage replay for damage / AFK kill credit / drop rate, one result per scope, editable Account Wide controls, scope switching, native account totals, and mobile layout.


## Full comparison throughput

Full comparison now requests only the selected metric. The previous individual scan also precomputed every other ordinary metric after every mutation; that speculative work has been removed. Existing completed/partial comparisons for the requested metric are reused.

For sufficiently large scans, the browser uses up to three dedicated comparison workers (up to two on devices reporting 4 GB or less, and a sequential fallback for one available worker or small jobs). Each worker keeps one imported baseline and returns only compact projections, never parsed account graphs. Jobs are assigned as workers become available. The coordinating session merges results by candidate ID, restores stable gain/name ordering, and recalculates the combined route serially with the same formulas and thresholds. Cancellation, scope changes and unmount terminate the helpers. No source families are pruned to achieve the speedup.

A browser benchmark of the same 96 shared stamp comparisons took 16.8 s with three workers versus 37.9 s sequentially (2.25x). This is a fixture/subset measurement, not a promise for every save or complete catalogue. Tests compare exact projected options/steps with sequential execution, out-of-order and duplicate deliveries, resuming cached work, helper cleanup and the one-core fallback.


### User-selected worker count

The calculator exposes a compact Workers selector for Full comparison: Auto (the existing conservative policy) or 1 through min(8, reported logical processors minus one), with a minimum limit of 1. Manual counts are honored up to the number of remaining candidate jobs; choosing 1 uses the coordinating calculation worker without spawning helpers. The preference is stored under `idleon.review.workers.v1`, restored across goal changes/reloads, and clamped if the device limit is lower. The control is disabled while calculating; Cancel terminates all helpers. The method disclosure explains the CPU/memory tradeoff. Browser coverage checks a real four-worker launch, serial mode, cancellation, saved preferences, clamping and mobile width.

## Primary-stat audit fixes — 2026-10-09

STR, AGI, WIS, LUK and their combined All Stats metric now include the Grey Tome Book and Troll-set amplification of Tome bubbles, and personal/family obol MISC bonuses. Family bonuses replay provider comparisons in roster order, comparing the raw candidate with the previously amplified cached bonus. The selected character's uninvested talents contribute zero, Doot's Cosmo contribution requires that character's Divinity level 2, and Dummy Thicc Stats uses the client's logarithm and percentage-floor operation.

The shared equipment parser retains equipped trophy, nametag and premium-hat bonuses until their character-specific portal unlocks replace those slots with Gallery/Hat Rack bonuses. Well Dressed affects attire MISC bonuses only. The companion parser applies borrowed-token base bonuses after owned upgrades, retaining ownership and upgrade metadata.

`test-primary-stats-audit.js` covers all nine findings, including raw-save parsing, collection replacement without double counting, family-provider ordering, companion-token overlap, logarithm boundaries, and all 44 fixture character/stat totals. When `../audit/N.js` (or `IDLEON_CLIENT_PATH`) is available, it executes the supplied client's talent, companion and logarithm functions as independent oracles. This resolves the confirmed findings against that supplied client; it does not certify future game updates or imply that every bonus source is an automatically purchasable planner action.


## 2026-10-09: indirect primary-stat dependency corrections

Applied the remaining deep-audit findings against the supplied executable client:

- Current Lv0 levels feed account family calculations. Direct stats, Golden Food and talent-level family bonuses share the client roster-order selection rule. Family feedback updates flatTalents as well as talent pages.
- Account-wide super talent lookup checks both presets, including an empty selected preset. Per-preset displayed talents remain preset-specific.
- Added talent levels respect Divine Design and Doot's per-character Divinity level-2 gate.
- Refreshed the Research catalog from the extracted client (52 rows). A shared getJellyReward lookup implements the strict progress > reward-index gate. Research-point rewards, Golden Food, Prisma, exalted stamps, Emperor rewards, Meritocracy and cooking ribbons use it.
- Meritocracy applies the character World-7 gate, account voting gate (0.25/1 base) and Jelly reward 33. Primary-stat character contexts remove cached vial/sigil amplification and recompute ballot effects without mutating shared account data.
- Jelly reward 50 adds reward/100 to the exalted percentage pool, matching executable units. Reward 28 adds to the Emperor percentage pool. Reward 60 adds floor(ribbonRank/20)*reward to the ribbon percentage pool.

The new bubble map was used to check stat, stamp, meal and Golden Food paths. Its strength-sources-worker is tested against all 44 account-review primary-stat totals.

Validation: test-primary-stat-dependencies.js executes extracted native Jelly, Meritocracy and ribbon formulas; covers both sides of unlock thresholds, inactive Divinity paths, both super-talent presets, stale cached levels, family feedback, research budgets, immutable character scoping, and full raw-save propagation through Emperor/summoning/meals, Meritocracy/vials and ribbons/Golden Food. It runs in test:review-stats alongside the prior nine regressions, route replay and browser/mobile checks. These establish coverage of the reported defects, not exhaustive equivalence to every possible live-game state.
