## Nested EXP tabs (2026-09-20)

- Optimizer retains compact save-based actions. EXP Sources indexes the installed client additive pool and separate multiplicative factors; conditional/unparsed sources explicitly say Not evaluated.
- Equipment catalog extracted from addNewEquip records in the installed audit/N.js. Direct EXP stat IDs: 4 additive; 78 CLASS_EXP_MULTI; 84 BONUS_CLASS_EXP. Matching equipment stats sum before each multiplier.
- Gear ownership reads only ChestOrder/ChestQuantity, InventoryOrder/ItemQTY and EquipOrder/EquipQTY, including numeric-key dictionaries and serialized arrays. Slab/unlock history is not ownership.
- Free progression shortlist: Starstrut, Emperor Wings, Tome Pro and W7 Prehistoric armor/weapons. Paid/event/acquisition-unverified owned gear is disclosed separately, with no acquisition recommendation. Free target unlocks and affordability are not evaluated.
- Gear selection maximizes BASE Class EXP multi in this shortlist per slot, respects saved character level and weapon family, counts ring copies, and allows transfers for ONE character at a time. It is not an EXP/hour or full upgraded-item/set simulator. Premium conversions, upgrade stones, damage and AFK effects are not scored.
- References: https://www.digitaltq.com/wiki/idleon/anvil-tab-2 and https://www.digitaltq.com/wiki/idleon/the-emperor-world-6-boss . Installed client is authority for base item stats.

# Current UI: save-based priorities

The earlier W1/W2 route and scenario calculator UI have been replaced. The page now shows three concrete saved-account opportunities, other lower-priority options and already-handled sources. The previous notes below are historical formula research, not a description of the current UI.

New mappings audited from installed client:
- Holes[15][16]: Justice Class EXP reward level, base coefficient 1.
- Holes[15][19]: Justice multiplier reward level. Percentage = 0.1 * ceil(level / (250 + level) * 2500).
- Holes[4][0]: Monumental Vibes, +25 points of monument amplification per level. Before Fountain effects, Justice EXP = reward level * max(1, 1 + multiplierPercent / 100 + 0.25 * VibesLevel).
- Justice's Fountain factor is excluded from displayed projected additive points and explicitly labeled. Its multiplier reward is not called a separate total-account EXP multiplier.
- Holes[13][47] activates Gloomie Expie: 25 * Holes[11][26].
- Holes[13][83] activates Sanctum of EXP: 40 * Holes[11][55].
- UpgVault[39] is Active Learning. The previous regex extraction skipped array literals; direct evaluation of the constant UpgradeVault table confirms index 39. Normal purchase limits do not clamp higher saved levels from other systems.
- Snootie3 quest rewards StampA44, with objective Find Mister Jazzie. Stamp level zero flags the missing source but does not establish quest accessibility or inventory ownership.

Priority is a heuristic using missing independent multipliers, existing unactivated unlocks, and repeatable gains. It does not estimate difficulty, upgrade currency, total character EXP pools, or every other EXP system. Planning chunks of +100 / +10 levels are labeled as targets, not caps. No-save and missing-field cases do not create fictional deficits.

Justice round prerequisites (EXP reward 33, multiplier reward 77) and Temple/Centurion terminology cross-checked at https://www.digitaltq.com/wiki/idleon/the-caverns . Rewards are offers, not guaranteed drops. Browser validation used the actual loaded save locally; full save contents were neither printed nor stored in this repository.

---

# Class EXP formula audit

Source: installed IdleOn client, extracted locally to ../audit/N.js.

- `_customBlock_ExpMulti(0)`: `AlchBubbles.expACTIVE` and `StampBonusOfTypeX("classxp")` both enter the summed additive term divided by 100. The latter arrives through ExpGainLUK6. The label "Multi" alone does not establish an independent multiplier.
- Grind Time catalog record: `9.7 .3 bigBase`, active bubble, yellow index 8. This view computes the base value only; equipment/activation and amplification are not decoded.
- StampA44: `classxp,decay,4,200,...`; base formula 4L/(L+200). StampExalted_double, Mainframe and Pristine multipliers alter effective output. No fixed +4 effective cap is claimed.
- LUK below 1000: ((LUK+1)^0.37-1)/30. At/above 1000: 0.8*(LUK-1000)/(LUK+2500)+0.3963. The final additive factor includes this term times (1+talent35/100)/1.8.
- ExpGainLUK2 includes early level bonuses: 150 below 10, 100 below 30, 50 below 50. Card-set 0 is conditional on level <50; meal Clexp on level <120. WeeklyBoss.c is clamped at 150.
- Independent factors include (1+Jelly RoG 30/100)*(1+Jelly RoG 62/100). Local audited reward values: 20 and 25. RoG rewards activate when Research[7][9] is strictly greater than the reward index.

Scope: exact base curves and algebra, two source save levels, Jelly reward status and roster level gates. Not a complete save-derived EXP simulator. Missing inputs stay unknown. Scenario additive pools must include all effective additive points, including the equivalent LUK contribution; final character-sheet multipliers cannot substitute for this pool. Costs and resource affordability are not modeled.

Validation: test-class-exp.js covers linear gains, decay milestones, marginal returns, LUK threshold, unknowns, serialized save arrays and roster gates. Browser scenario: pool=1000, delta=30 yields 2.727%; factor 1 -> 1.2 yields 20%; +1% target requires 11 points or 37 additional unmodified Grind Time levels.

## W1 -> W2 action route (2026-09-20)

17 ordered checks are implemented in class-exp-route.js. The order is a practical heuristic: free fixes and available resources before long farms. It is not a price-ranked optimizer. Saved values are decoded only for verified mappings; other steps explicitly require an in-game check.

New local-client mappings:
- Wicked Smart: UpgVault[3], +2 per level, cap 500; VaultUpgBonus applies (1 + UpgVault[32]/100). Both saved fields must exist before reporting the effective bonus.
- Flurbo Class EXP: DungUpg[5][2], formula 45L/(L+100), additive in Class EXP. Lv 100 = +22.5 points, not the formula maximum.
- Just EXP talent: decay 30L/(L+50). Level 100 = +20 points.
- Mimicraught: base +1 MonsterEXP per vial level; enters additive EXP.
- Early Arcade Class EXP: decay 20L/(L+100), distinct from later independent Arcade EXP factors.
- W7 stamp source is not an early-W1 unlock just because stamps are managed in W1.

Research sources used for locations, availability and progression context:
- https://www.digitaltq.com/wiki/idleon/world-1-guide-blunder-hills
- https://www.digitaltq.com/wiki/idleon/the-upgrade-vault
- https://www.digitaltq.com/wiki/idleon/orion-owl-mini-game-guide
- https://www.digitaltq.com/wiki/idleon/star-signs-constellations
- https://www.digitaltq.com/wiki/idleon/special-talents-guide
- https://www.digitaltq.com/wiki/idleon/statues
- https://www.digitaltq.com/wiki/idleon/alchemy
- https://www.digitaltq.com/wiki/idleon/post-office-guide
- https://www.digitaltq.com/wiki/idleon/poppy-the-kangaroo-guide
- https://www.digitaltq.com/wiki/idleon/bonus-ballot-guide

Some guide unlock thresholds differ from the installed client's tables. The route defers unlock checks to the game instead of copying a conflicting threshold. Community opinions surfaced during search were not used as numerical evidence or universal target levels.

Browser validation: isolated synthetic early-world export (no Research) loaded successfully, Vault Lv20 with mastery Lv50 displayed +60, dungeon Lv100 displayed +22.5, Grind Time Lv50 remained activation-unknown. World navigation, collapsed advanced controls and the additive calculator worked; no browser console errors. The test tab was closed and the real page contains no synthetic save.

### Further decoding: Salt Lick, Arcade and conditional EXP
- Client `_customBlock_SaltLick` = saved SaltLick[3] × SaltLicks[3][3] (0.2). Catalog normal cap 100.
- `_customBlock_ArcadeBonus` + ArcadeShopInfo: additive index12 uses decay(20,100,L); multi index60 uses decay(50,100,L). Exactly level101 doubles. Companion27 also doubles; this modifier is explicitly excluded pending ownership decoding.
- `_customBlock_ExpMulti(0)`: WeeklyBoss.c capped150; automatic character catch-up 150/100/50/0 at levels <10/<30/<50/50+. Cooking Clexp applies below120; only a fully ineligible saved roster is marked inactive, eligible meal values remain undecoded.
- Shared source evaluations are displayed in Arcade, Construction/Refinery, Hole, Cooking, Characters, Challenges, Dungeons, Alchemy and Stamps where present; no duplicate formulas.
