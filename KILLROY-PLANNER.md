# Killroy planner

The dedicated page routes through `KillroyPage` before the generic Arcade renderer. Account decoding and 20 weekly rotations use the existing Toolbox-derived calculation engine. Schedule labels are relative to the saved week, not the computer clock; unlocks and KillroySwap are held fixed. Missing reset timing suppresses the schedule.

## Sources and calculations

- `vendor/idleon-toolbox/parsers/misc.ts`: saved options, permanent bonus curves, deterministic class/monster rotation.
- Local installed client `../audit/N.js`: `OptionsListAccount[106..111]`, post-run unlock conditions, `SkullShopDesc`, purchase handlers, and the 50-purchase arcade limit at option 417.
- `vendor/idleon-toolbox/data/website-data/shared-data.json`: skull prices, checked by regression test.

Post-run recommendations are marginal-gain estimates. Balanced (the default) compares only timer and bonus-skull relative gains, using (100 + timer level) × (100 + skull level), while enforcing the skull upgrade unlock. Other goals combine timer with a respawn multiplier only when the player enables the spawn-limited assumption. Drop goals add the relevant level multiplier and first-level unlock. They do not predict actual kills, account for differing map/class throughput, or reproduce the per-run skull-drop diminishing chance. These limitations are displayed beside the controls. Equinox extra upgrade slots and completed-run thresholds are enforced.

Shop planning first reserves the player's requested purchase count, then greedily spends the remainder on weighted relative applied permanent bonus gain per skull. Each purchase adds one level, regardless of the catalog's reward quantity field. Consumables are selected explicitly, not compared to permanent bonuses using invented exchange values. Unused budget remains visible. Third-fight and early Gallery purchases are independent chance attempts, never guaranteed unlocks; stop and recalculate after success. Early Gallery attempts never advance simulated deterministic levels. The reserved future bonus is excluded.

All plans are local previews; no save data is changed. Validation: `node test-killroy-model.js`, `node test-killroy-browser.js`, `node test-arcade-pages.js`, and static build.


## Installed-client audit — 2026-09-27

Reviewed the purchase handler, display text, bonus definitions, all `KillroyBonuses` consumers, `KillroyXtra` / `KillroyXtra2` unlocks, weekly reset, and skull-drop handler in `../audit/N.js`. Claims below concern that installed client snapshot; a later game patch may change them. `test-killroy-client.js` executes its bonus expression directly at multiple levels and checks critical consumers and gates. Run it separately from portable model tests.

| Shop benefit | Actual application / limit |
| --- | --- |
| Artifact find | 1 + L/(300+L), approaches 2× |
| Crop evolution | 1 + 9L/(300+L), approaches 10× |
| Jade | 1 + 2L/(300+L), approaches 3× |
| Gallery | Adds 10L/(200+L) percentage points to Gallery's additive multiplier pool: contribution approaches +0.10×, not +10× |
| Masterclass drops | Raw shop value is 1 + 1.3L/(200+L), but the consumer uses 1 + raw/100: 1.01× at level 0, approaching 1.023× |
| World 7 EXP | Raw shop value is 1 + 0.8L/(150+L), but consumers divide by 100: standalone factor 1.01× to <1.018×. Research has a separate factor; Spelunking shares its pool with Arcade and a Spelunking upgrade |
| Daily coral | 25L/(250+L) percentage points in a shared additive pool, approaches +25% |
| Future bonus | Formula exists; only the shop-description consumer was found. Excluded from plans |

None of these curves reaches its asymptote at a finite level. There is no finite level-purchase cap in the audited handler. UI floor/ceil formatting can hide small gains; it does not quantize the underlying applied bonus. Artifact/evolution roll probabilities may already succeed on a particular target; this is separate from a universal shop-level cap.

**Hidden Gallery benefit:** `PodiumsOwned_Lv2` also consumes `min(2, 10L/(200+L))` inside an overall rounding operation. The raw contribution reaches its cap at L=50; when the other contributions are integers, rounded additional podium counts step at L=11 and L=36. Actual benefit depends on podium ownership and higher-grade coverage. The multiplier continues improving after this cap. Automatic spending scores the account Gallery multiplier, not discrete podium-grade jumps; this limitation is explicit in the page and players can target Gallery using Buy first.

**Unlocks:** items 10–14 need Rift[0] >= 50. Items 15–19 additionally require OptionsListAccount[466] >= 3 (Billroy dialogue). The first version omitted this second gate; it is now enforced in both the selector and optimizer.

**Purchase rules:** fixed catalog prices, one permanent level per successful purchase, no purchase-side Meritocracy multiplier found. Third fight is a 1% chance until unlocked, then no further purchases. Gallery is 5% per attempt while level <2, then deterministic +1 level. Chance purchases do not simulate a guaranteed success. Arcade is capped at 50 purchases (500 balls) per week via option 417, reset weekly. The permanent-bonus ceilings above are diminishing returns, not hard purchase caps.

**Skull income is different from spending:** the drop formula includes Meritocracy bonus 18 multiplying a base probability capped at 25%, with within-run diminishing returns and a 0.1 floor on its reduction factor. The cap is applied before Meritocracy; it is not an absolute 25% final chance. This affects future skull earnings, not purchase prices or shop upgrade strength. Point recommendations remain estimates and do not claim an exact future skull total.

**Scoring repairs:** Masterclass/EXP use actual percentage application. Gallery and coral marginal returns use their decoded account additive pools to avoid overstating returns. EXP is scored by the standalone Research factor; other W7 skills can have different dilution. No global character-output equivalence is claimed by equal priority weights.
