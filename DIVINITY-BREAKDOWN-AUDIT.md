# Divinity breakdown audit — 2026-10-24

Scope: the supplied local game client (`../audit/N.js`), its `DivPTSPerHr`, `DivPerHr_EXP`, Coral Kid and Sailing artifact handlers, and the local parsed-account inputs. This is not a claim about later game releases.

## Corrections

- Both rates use Post Office `BoxRewards["22c"]`, the third Box of Gosh bonus. The previous breakdown read index 0. At box level 800, the correct contribution is +18% to each additive pool, rather than +50%.
- Ashen Urn uses `min(highest class level, 200 * artifact tier)` percent. The generic artifact helper used the wrong cap field. Tier 6 counts up to level 1,200; tier 7 counts up to 1,400 in this runtime, even though its tooltip says 1,600.
- Jade Rock uses 3% per complete 10 slab items above 500, multiplied by Lab, Legend Talent, Meritocracy and Vault amplifiers and its runtime tier factor. The supplied client checks description column 13 for the tier-7 multiplier, where Jade Rock has its sixtupled text. Consequently tier 7 receives base scaling, rather than the tooltip's 7x. The breakdown follows the executable code and explains this discrepancy. These two corrections are local to the Divinity breakdown; they do not rewrite other Sailing displays.

## Formula coverage

Points: base style rate × (1 + additive percentages / 100) × each independent multiplier.

Six additive terms: Box of Gosh, achievements 299 and 305, Divinity mastery, bribe 39, Vault upgrade 72.

Fifteen multiplier terms: gem-shop Divinity purchases, Purrmep major link, upgraded King Doot, sushi reward 47, Singularity Transmutation, Snehebatu/Arctis/Harriep/Omniphau blessings (four independent factors), Ashen Urn, Jade Rock, weekly Divinity vote, Lamp Divinity wish, Reef Devotion, highest effective Polytheism.

EXP uses the same structure with its own style base.

Nineteen additive terms: God Rank, Box of Gosh, Div Spiral sigil, Stiltmole card, Divinity EXP stamp, Pious at Heart, Divinity statue, Divinity EXP meals, Maple Syrup vial, Inner Peace, World 5 merit, Divinity mastery, Divinity EXP star sign, guild skill EXP, arcade Divinity EXP, equipment EXP, weekly Divinity vote, Magma armor set, Vault upgrade 73.

Ten multiplier terms: gem-shop Divinity purchases, Purrmep major link, Divinity Legend Talent, all-skill EXP Meritocracy selection, all-skill EXP Legend Talent, Whale companion, Volcano Link, Singularity Divinity EXP, Crystal Capybara, highest effective Shared Beliefs.

The generic additive “all skill EXP” pool is not an extra term in the Divinity handler. The shared all-skill multiplicative product is explicitly represented. Equipment details are informational children of the equipment row and are not added a second time. All inactive terms remain visible.

## Limits and interpretation

Every source has an expandable explanation. Fixed unlocks, finite level caps, account-dependent caps, asymptotes, next levels and slab breakpoints are distinguished. Vault and Legend Talent maxima use current parsed account caps; projections hold other amplifiers fixed. Pious at Heart, Polytheism and Shared Beliefs show diminishing-return milestones. Coral Kid shows the next-level factor with the current reef count where relevant.

For composite bonuses such as meals, statues, equipment and vote amplification, the UI explains their inputs without inventing a global maximum. Gem-shop purchase availability is not inferred from its linear bonus formula. No fixed maximum is asserted where the audit has not established one.

Rates are before activity eligibility and exclude received Mantra sharing, unclaimed AFK time and future purchases. Existing account parsing helpers supply composite sub-bonuses; the native rate comparison tests their placement and composition, not every possible nested game subsystem. The artifact-loop comparisons additionally test the two corrected artifact inputs directly against native code.

## Regression coverage

- Native comparisons for all 12 Coral Kid costs/bonuses, all eight styles and both complete rate formulas.
- Native artifact-loop comparisons across all tiers, class-level caps and slab-step boundaries.
- Assert that both rates request Box of Gosh subbonus index 2.
- Assert that every source has a limits explanation.
- Browser checks for all 21/29 rows, expandable notes, character/metric switching, navigation, missing saves and mobile overflow.
