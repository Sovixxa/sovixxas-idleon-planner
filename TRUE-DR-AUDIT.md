# True DR calculation audit — October 3, 2026

## Corrected model

The previous page multiplied a flattened chance by DR, capped receipt odds at 100%, and rounded the same product for quantity. It also displayed each nested path as a separate item. Those assumptions did not model the client's loot generator.

The revised page groups matching item/source rewards and combines their independent root paths. It retains intermediate table quantities, shared-parent probabilities, native DropOdds rounding, Rares Everywhere at the first nested level, and the DR cancellation inside nested tables. The displayed quantity is conditional on receiving the item, rather than an unconditional average per kill. Multiple identical raw entries also contribute independently.

Native base MonsterDrops and DropTables are preserved in true-dr-tables.js, with their source hash. build-true-dr-tables.js reproduces them from ../audit/N.js. The data covers 365 raw sources and 49 nested tables; the UI groups the imported catalog into 3,248 item/source reward cards.

Golden Nomwich from Crystal Carrot has five paths, not one. At 250,833.33333333334× DR, one normal crystal roll, and no Rares Everywhere bonus, those paths yield 301 + 282 + 251 + 452 + 377 = 1,663 items before post-generation stack bonuses. This is a controlled example, not a claim about the user's current live character.

## Multikill, Death Note and DB

Material multikill applies only to the first eligible main monster material, as in the active-loot consumer. It uses the saved character's damage/accuracy, world-specific Death Note and miniboss ranks, unlock and hit/damage gates, prayer HP penalties, the tier ladder, and World 7 diminishing returns. Its final quantity is rounded up.

Saved Death Bringer Wraith Form replaces ordinary damage and accuracy with native Grimoire_DMG and Grimoire_ACC formulas. The Death Bringer family/kill-per-kill bonuses are not extra loot-stack multipliers. Wraith bones/Graveyard Shift use another drop system and are not represented as ordinary monster items.

## Special rules and limits

Crystal Embiggener is combined with the selected caller roll count before native rounding. Gems/candies use their own power-law gates and quantity rules. Exported quest, stamp and storage eligibility is checked. Books and recipes have encoded rewards, unlock gates and ordering rules; their estimates are withheld. Dungeon, skilling and dynamic-stat sources likewise show an explicit unmodeled reason rather than using ordinary DR. Card and coin calculations remain out of scope.

These are normal active-kill calculations from a saved setup. Other live class loot bonuses, giants, AFK claims, dynamically inserted loot, and map-dependent changes to saved character stats are not modeled. Tempest/Arcanist mode material multikill is withheld because ordinary damage is inappropriate there. The page labels its normal-active-kill scope; live Orb score is entered manually.

## Validation

- test-true-dr-client.js executes the actual client's DropOdds and GenerateMonsterDrops functions in a controlled harness: 420 boundary comparisons; 2,158 deterministic ordinary item/source checks across two DR values; 48,000 low-DR Crystal Carrot simulations covering receipt probabilities and expected quantities.
- Native Wraith damage/accuracy expressions are checked at three upgrade scales.
- test-true-dr.js checks merged paths, intermediate stack sizes, receipt-conditional quantities, quest gates, gem scaling, capped reward encoding, multikill eligibility/HP penalties, W7 diminishing returns, and actual Death Note plus miniboss rank contributions through the imported calculation engine.
- test-true-dr-browser.js verifies import, selectors, a single aggregated Nomwich card with all five paths, quantity display, icons, search, and mobile overflow.
- test-drop-rate.js retains the existing roster, saved-DR reconciliation and import immutability checks.

Native parity validates the specified base-loot scenarios; it is not a claim that live, unexported combat effects are known.

## Expanded audit: complete ordinary-item stack pipeline

The first audit stopped at GenerateMonsterDrops. That was insufficient: ActorEvents item initialization subsequently multiplies golden-food and statue stacks. This omission materially understated the UI even though the base-generator tests passed.

### Corrections

- `BundlesReceived.bon_k` (Autumn pack) doubles golden-food and statue stacks after generation. It does not change the character DR stat.
- Golden-food proc chance: Tesseract 30 + Palette 24 + Big Fish 5. On success, multiply by `round(2 + Legend Talent 2 / 100)`.
- Statue proc chance: Tesseract 18 + Statue Metallurgy + Palette 19 + capped linked Kattlekruk minor bonus. On success, multiply by `round(2 + (Legend Talent 2 + Spelunking shop 48) / 100)`.
- These are single Bernoulli procs, not repeated doubling for chances above 100%. The UI averages partial proc chances and exposes the stack factor on each affected card.
- Fixed the imported statue helper's fallback: an account without a linked Kattlekruk must receive zero Kattlekruk statue bonus, rather than borrowing an unrelated character's Divinity level. The native global minor lookup sums actual links; Doot's all-character shortcut only applies to the native gold/AFK minor types, not statue type 8.
- Saved Gimme Gimme is now a mixture of two-roll and normal outcomes, using the native random range (0.05, 100) and its four miniboss exclusions. Its branch precedes Orb and overrides Crystal Embiggener when it procs.
- Added a manual live DK Orb score. It produces a mixture of adjacent integer roll counts, with Crystal Embiggener rounding applied afterward. Score zero means inactive. This models the ordinary outside-W5+-Colosseum branch; a live score cannot be inferred from the account export.
- Preserve unrounded Crystal Embiggener until the caller constructs the final iteration count.
- Round primary-material multikill per discrete roll outcome before averaging.

### Saved-stat coverage reviewed against native Drop_Rarity

The ordinary DR expression includes LUK; talents and Royal Guardian grades; post office; gear and obols (both DROP_RATE and DROP_CHANCE); bubbles, cards and passive card caps; starsigns; guild, card set, shrine, prayers, sigils, shinies, arcade, stamps; boss spillover and Equinox; Summoning, Tome, Owl, land ranks, vote, Hole schematics/measurement/monument, Grimoire, Vault, Crop Depot, Emperor, Efaunt set, Exotic Market, friends, Legend Talents, Spelunking and research. Golden Cake uses equipped food plus Beanstalk and its effect multipliers.

Ordering was checked separately: capped chip, `bun_v` +2, Archlord, Ninja +0.3, `bun_p` ×1.2, followed by the native multiplicative pools for Tesseract map, Royal Statue, card multi, Royal Guardian family (including provider-specific Family Guy), companions and upgraded Mama Troll, shared Sushi/Jelly, Glimbo, Tome, bonus equipment, Minehead, Equinox cloud, charm, multi equipment and vial. Existing family / golden-food native tests remain in place. This is an expression-level coverage review plus targeted native tests, not an assertion that every transitive account helper has been independently reimplemented.

The item actor's ordinary stack writes were inspected through initialization and collection. Apart from golden food/statues, the other multiplications there are dungeon credits; recipe stacks are forced to one. Auto-loot ownership changes pickup, not the ordinary quantity multiplier.

### Concrete imported-save result

For the example export's LumbaJacker, normal DR is 86,351.09014346186×. Golden-food proc chance is 130.20062532569045%; Legend Talent contributes 600%, making the proc ×8. With Autumn ×2, the combined factor is ×16. Crystal Carrot's Golden Nomwich total changes from 574 to **9,184**, with Orb score zero. Statue proc strength is ×10 with Spelunking, so the same account gets ×20 statue stacks. These are saved-character examples, not an estimate of unobserved live combat.

### Additional validation and remaining scope

240 combinations execute the actual item-actor expression across ordinary material, golden food and statue IDs, paid-pack states, proc probabilities, Legend Talent rounding thresholds and Spelunking upgrades. Fifteen native Orb/Crystal combinations verify caller rounding. Paid-bundle regression tests toggle `bun_p`, `bun_v`, and `bon_k`; Autumn must change stack factors without changing DR. Browser tests verify the 9,184 result and changing the Orb input, plus mobile layout.

The earlier statement excluding all Orb effects is superseded by the manual score support. Giants (250 / 2,000 rolls plus special tables), wormhole and plunderous enemies use distinct caller branches and remain excluded from the normal-kill view. AFK claims, dynamic inserted loot (bones/dust/etc.), dungeon/skilling systems, unmodeled books/recipes and map-dependent stats remain outside this calculator. They must not silently be represented as ordinary active kills. No claim of universal live-drop parity is made.
