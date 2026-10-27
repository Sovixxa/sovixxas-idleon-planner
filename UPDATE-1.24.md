# IdleOn v1.24 website update

Source: installed Steam build **26123052**, October 22, 2026. Extracted game code SHA-256: `6a2fb3bbae934929de0efcd884689c368424e6398eee6409d764834402a3e1bb`. Implementation checked October 28, 2026.

## Website changes

- Refreshed the game audit baseline, Research/Ninja/Sushi/card catalogs, companion definitions, Slab ordering, and Gem Shop listings.
- Event Shop now contains all 68 entries, including the 12 v1.24 additions, with current artwork and save ownership decoding beyond the old 56-entry limit.
- Added Witch Hat, Stiltmole Mask, Warlock Hat, and Spooky Scary Nametag to item/equipment records. Updated Gallery and Hat Rack sources. Witch Hat and Stiltmole Mask have the patch-note Halloween acquisition route; Warlock Hat's acquisition route remains unverified.
- Removed Tome Immortal's replica from the Slab catalog, matching the current game. Existing Tome reward claims already stop at the Top 0.1% tier.
- Jelly: 4× Sepsis Bloodcells, continuous boss attack cooldown progression, current currency base term, Big Clot multiplier, Ivory Locket slots, and artifact slot contribution.
- Sushi: current Superior Sushi Skillz cap and Full Kitchen Simmer's 10× fuel capacity in both calculator implementations.
- Bubba: Meatmaxxing's 3× production and half-price upgrades, including the optimizer and legacy pages.
- Menagerie: Nightmariner unlock gates in shared calculations and display, Extra Lumi and companion contributions, and Pipsqueak's Omnijade count/daily levels in the Boosts view.
- Sneaking: saved Omnijade levels contribute to upgrade effects without increasing the purchased level/cost.
- Upgrade Vault: Gilded Awnings adds 25 levels only to the game's eligible Research row 63 upgrades, in both parsers.
- Friend bonuses: new Event Shop slot included in the shared calculation.
- Spelunking EXP: Killroy applies as the independent multiplier used by the updated client.
- Rebuilt the shared calculation bundles and static website.

## Existing behavior and game-side fixes

Verisimilitude artifact handling already includes the seventh tier. Clamworks compensation rows already use the full catalog and saved worker class. Inventory size, awarded Research points, shells, daily meal level changes, Sigil progress, and Funeral Flowers are read from the save; the website does not perform the game's daily rollover or award these resources. The tiny-cog calculator does not simulate the game's T11 random-drop eligibility. These game actions are not claimed as new website simulations.

## Validation

- 93 direct/transformed catalog comparisons against the installed client.
- Jelly client formula and objective tests; 2,916 Sushi native comparisons; 1,890 Bubba native comparisons, including shop ownership.
- Current-update ownership regression tests for Jelly, Sushi, Bubba, Nightmariners, Slab, companions, and artwork.
- Menagerie native rate checks, integration tests, and browser tests; Sneaking optimizer and collection tests.
- Event Shop browser: all 68 images load, new-item search works, desktop/mobile layout checks pass, no page errors.
- Sushi browser: all seven views and desktop/mobile checks pass.
- Gem Shop: 106 listings with valid images and save indices.

The full `npm run verify` baseline stopped at an existing statue-rendering text expectation in `test-misleading-values.js:41`. The statue UI had uncommitted changes before this update. The targeted update checks and static build are verified separately; this is not a claim that the entire suite passes.

These changes are local. No deployment is recorded by this update.

## Follow-up audit — October 28, 2026

Found and fixed two issues in this update:

1. Sneaking item-level caps still used purchased levels alone. They now include saved Omnijade levels and the mastery contribution specified by the native `NLbonuses` branches. Charm caps retain their separate formula. Forty-five native comparisons cover all five affected cap types, three Omnijade levels, and three mastery levels.
2. `apply-v124-math.cjs` failed when rerun because it expected an intermediate test stub that had already been replaced. The migration now recognizes the final state. A replay in an isolated temporary directory verifies no files change.

All 20 targeted suites passed. Event Shop and Menagerie desktop/mobile browser checks passed with no page errors. Additional integration checks cover every legacy Vault cap, saved Omnijade bonuses, and switching back to an account without those bonuses. The calculation bundles and static build were regenerated. The unrelated full-suite statue-text assertion remains outside this update; the complete suite is not claimed to pass.

## Publication checks — October 28, 2026

Static build and the full release suite passed. The v1.24 model, native audit, Event Shop browser, golden foods, AFK popup, AFK persistence, and statue layout checks passed. Older AFK browser coverage still expects the removed editable rate input; the QOL browser test expects a favorites button on the currently inactive Home page; the misleading-values test still expects the previous statue text. These broader suites are not claimed to pass.
