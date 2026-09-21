# IdleOn Planner — New Chat Handoff
Updated: 2026-09-20. This replaces the old Prisma-only handoff.

## Start here
Continue developing the existing local IdleOn account planner. Do not rebuild it or switch frameworks.
- Project: C:\Users\Sofia\Documents\ChatGPT\Idleon\idleon-jelly-optimizer-v052
- Parent workspace: C:\Users\Sofia\Documents\ChatGPT\Idleon
- App: http://localhost:3000/
- Vanilla HTML/CSS/JavaScript; Node local server. No React or build step.
- Run from project: npm start. Check whether the server is already running before starting another.
- npm test runs the regression suite, including Cooking, Lab and World 4 tests.
- index.html is the app shell, styles.css is shared styling, app.js contains state/navigation and many page renderers.
- Many changes and assets are uncommitted. Preserve them; do not reset or overwrite unrelated work.
- No AGENTS.md was found previously; check current instructions on entry.
- Last user request was to prepare this handoff. No new feature was requested after Cooking/NMLB.

## User preferences — default style for ALL new pages
The user repeatedly asked for less scrolling and simpler presentation. These are established preferences:
1. **Use Arcade/Stamps/Post Office as the visual and interaction reference.** Compact dark purple panels, small closely spaced tiles, actual in-game sprites, saved level/status immediately visible.
2. **Keep the small layout.** They rejected oversized stamp cards. Stamps use three side-by-side category columns and roughly 6–7 small stamps per row within each category when space allows. Adapt responsively, rather than forcing a fixed oversized grid.
3. **Hover AND click:** hover gives a quick name/effect/level preview; clicking opens persistent, dismissible details. Preserve both interactions. Details should be a compact floating panel/overlay, not a giant section that pushes the whole page down.
4. Use compact internal tabs or short pagination to avoid a long scrolling page. Aim to fit the overview in the current viewport. Do not hide essential information just to force a no-scroll claim; check the actual browser.
5. Sidebar world groups start **collapsed by default**. Keep one sidebar page per game system and related sub-tabs inside that page.
6. Use the real game's recognizable layout when appropriate: Construction shelves, cog board, Worship totems. Use real game assets, not emoji substitutes for available sprites.
7. Show real numerical bonuses where decoded, including percent/unit, ownership, max status and special upgrades (Prisma, Cosmo, etc.).
8. Short, direct wording. Actionable recommendations: “level this bubble,” “upgrade this stamp,” “do this Hole upgrade.” They dislike generic advice such as “more kills = more EXP,” accuracy explanations, huge text blocks and unnecessary headings.
9. F2P-friendly. Separate paid-only benefits and long time gates. Jelly is a heavy time gate and must not outrank an easy upgrade solely for its eventual gain.
10. Show in-game currency denominations with coin images, not enormous raw copper totals.
11. Account-wide context is the default. Character selectors only where the game mechanic is character-specific.
12. Do not add redundant tabs. The user explicitly removed Construction “Flags” and “Building Levels”; current visible tabs are Buildings and Cogs.
13. The user removed Mining, Chopping, Smithing, Fishing, Catching and Trapping from the sidebar. Do not restore them without being asked.
14. Do not reintroduce the removed bottom “Class EXP / your account” section into Alchemy.
15. Keep relevant discoveries on their world/system page, not only in the EXP optimizer.

## App/page setup
The sidebar is declared in index.html. app.js selects the page, hides Home/Jelly panels as appropriate, and renders world/system pages inside:
panelWorld > .world-panel > #worldContent

renderWorldPage(name) routes specialized pages before the generic SKILL_PAGES/BASELINES fallback.
A sidebar entry does NOT imply a fully implemented decoder/UI; many later-world/account entries are still baseline pages.

Current sidebar:
- Home: saved character overview/activity.
- W1: Bribes, Stamps.
- W2: Alchemy, Post Office, Arcade.
- W3: Construction, Worship.
- W4: Lab, Breeding, Cooking, Rift.
- W5: Divinity, Sailing, Gaming.
- W6: Farming, Sneaking, Summoning.
- W7: Minehead, Spelunking, Research, Coral, Nametags & Trophies, Jelly Operator.
- Account & games: Class EXP Optimizer, Loadout Optimizer, Characters & Talents, Cards & Codex, Obols & Statues, Dungeons, Equinox, Tome & Slab, Guilds, Challenges & Events.

Module pattern:
- Static catalogs in *-data.js; sprites in assets/.
- Modules generally expose a window namespace in browser and module.exports for Node tests.
- Pass raw save data/root into render/evaluate/decode; keep math testable outside the browser.
- Add scripts/styles in index.html before app.js, respecting dependencies.
- Escape imported text before inserting into HTML.
- Shared style names include skill-tabs, skill-tab, section-head compact, exp-card, arcade-tile, compact-upgrades, upgrade-tip, upgrade-detail and detail-dismissed. Inspect current CSS before reusing a class.
- Page-specific CSS: cog-board.css, worship.css, lab.css, world4.css, cooking.css.

## Implemented pages and where they live
### W1
**Stamps**
- app.js renderStamps, stamps-data.js, styles.css.
- Three categories side by side, dense small sprite grids, saved levels.
- Hover preview and clickable persistent detail panel.
- This compact version, not the earlier oversized version, is the design reference.

**Bribes**
- app.js renderBribes, bribes-data.js, game-currency.js.
- Compact clickable grid, real bribe art, purchased status and hover effect.
- Detail has effect and price rendered as coin denominations.
- BribeStatus is the saved ownership field. Prerequisites/affordability are not fully decoded.

### W2
**Arcade**
- app.js renderArcade, arcade-data.js, styles.css.
- All upgrades in game order, real PachiShopICON sprites, saved level, calculated bonus and Cosmo status.
- Save ArcadeUpg: exactly level101 means Cosmo-balled; UI displays level100 plus Cosmo marker.
- Calculation includes Cosmo doubling. Companion27 extra doubling is explicitly NOT included yet.
- Unlock conditions and purchase costs remain undecoded. Missing is Unknown, not zero.
- Hover plus click detail with formula/breakpoint. Compact grid is a key reference.

**Post Office**
- app.js renderPostOffice, post-office.js, post-office-data.js.
- Character selector, 24 compact box tiles using UIboxUpg sprites.
- Shows saved points and all three per-box effects/activation thresholds in hover/details.
- These are individual box contributions, not final character stat totals.

**Alchemy**
- app.js renderAlchemy, alchemy-data.js, alchemy-save.js.
- Four colored cauldrons, compact stamp-style bubble grids.
- Saved levels, hover base bonus, click details, prominent Prisma markers.
- Prisma parser: OptionsListAccount OR OptLacc index384. Check rawData, rawRoot, rawRoot.data.
- Exact client token is '_abc'[cauldronIndex] + bubbleIndex + ','.
- Do NOT assume a/b/c/d zero-based mapping; first group uses underscore.
- Numerical bubble effect currently excludes Prisma and other source amplifiers; marker and effect amount are separate.
- test-alchemy-save.js protects the alias/sentinel/index behavior.

### W3
**Construction**
- app.js renderConstruction; construction.js/data; cog-board.js/css/assets.
- Only visible sub-tabs: Buildings, Cogs.
- Buildings uses three game-like shelves of nine sprites: account buildings, Worship towers, shrines.
- Show level, current cap, max status. Click shows base cap, unlocked increases, bonus sources and how to raise cap even before base cap is reached.
- Cap sources audited across other systems; preserve unknown-source handling.
- Shrine Construction levels differ from the shrine's separate AFK-earned level.
- Cogs shows the imported board layout/preset, characters, rails/shelf/flags using saved records. Sized down to minimize scrolling.
- test-construction.js, test-cog-board.js.

**Worship**
- worship.js/css, worship assets.
- Game-like Miniature Soul Apparatus Totalizer with eight saved waves and account bonuses.
- Separate adjacent calculator: user can edit **each of the eight waves independently**, not just set one number for all.
- Saved data is not mutated by calculator.
- TotemInfo[0] holds waves; Gaming/Ninja ownership gates bonuses.
- Some bonuses have total-wave thresholds; final Skill3 slot returns zero in the audited client.
- test-worship.js.

### W4
**Lab**
- lab.js/css/data, lab-assets.js and extracted assets.
- Internal tabs: Characters, Chips, Jewels, Mainframe.
- Characters show Lab levels and seven chip slots.
- Chips show total owned/equipped/spare; ownership includes equipped copies.
- Jewels show saved ownership; Mainframe shows base effects.
- **Not implemented:** connection graph, active connection status, amplified effect totals. Do not conflate owned with connected.
- Compact grids/tab views; test-lab.js.

**Breeding**
- world4.js/css/data.
- Assigned/Storage/All pet filter; compact paginated roster.
- Reads Pets and PetsStored, shows pet name, saved power, gene/ability and click details.
- Does not yet implement a full breeding optimizer/territory battle simulator.

**Rift**
- world4.js/css/data.
- Saved Rift progress, current challenge and milestone rewards with unlock status.
- Rift[0] determines progress; catalog supplies reward/challenge data.
- test-world4.js also covers Breeding and meal catalog/sprites.

**Cooking — latest work**
- cooking.js/css, world4-data.js, COOKING-AUDIT.md, test-cooking.js.
- World4.render routes Cooking to Cooking.render; app.js now passes rawRoot too.
- Internal tabs: **Meals** and **NMLB**.
- Meals: **two pages**, 40 then34 meals. 8 columns wide, 6 at narrower desktop widths, 4 on mobile.
- Each tile has actual meal icon, saved level, next-level meals remaining, projected time and ladles. Hover/click details remain.
- **Important limitation:** cooking speed is NOT automatically reconstructed. Estimate settings accepts combined in-game cooking speed/hr and Overflowing Ladle bonus %. No invented speed default.
- Example scientific notation accepted: 1.5e30. Sum speeds of kitchens intended to cook that meal; all entered speed is projected onto EACH meal individually, not simultaneously across all meals.
- Settings also expose companion meal discount and cap. Stored in a WeakMap per save object; survive navigation, reset on reload/new import.
- Saved levels, stock, progress, cap increases, achievement/Dream discounts and exported companion162 are decoded. Supports OptLacc alias.
- Inputs do not modify the imported game save.
- No modeled future speed gains or NMLB upgrades in regular time/ladle estimates.

NMLB details:
- 14-day forecast with next target highlighted, meal icons and before→after levels.
- Jade Emporium upgrade16 adds +1; paid bundle bun_s adds +2. Both means +3 **to ONE target**, not three separate targets.
- Eligible meals: level >=2 and below cap.
- Ties select the later/higher-index meal (client uses <= comparison).
- Re-rank after each simulated daily trigger; clamp to cap. Do not mutate saved levels.
- Assumes daily play, no other upgrades and unchanged cap. Not an exact wall-clock reset timer.
- Unlock or cap uncertainty is explicit; do not silently invent unlocks.
- Cap =30 + Causticolumn tier×10 + Jade20/21 (10 each) + Spelunk lore5 (30) + min(20,Grimoire26).
- Meal level111 has a huge client cost wall. Do not “fix” the huge cost by dropping that factor.
- Meals[0]=levels; Meals[1]=work toward produced meal; Meals[2]=stock.
- MealINFO[id][1]=work per meal.
- One ladle =1 hour × (1 + Overflowing Ladle bonus/100), advancing all kitchens.
- See COOKING-AUDIT.md for formula provenance and limitations.

Last verified loaded-account example (not universal / may change with next save):
- 74 meals; cap160; Jade NMLB owned, paid bundle not owned.
- Next Giga Chip107→108, then Tasty Treat107→108, then Divorce Cake108→109.
- Tests passed and both meal pages/forecast checked in browser. Temporary test speed was removed by reload.
- Browser was left on NMLB.

### Account / Jelly
**Class EXP**
- class-exp.js, exp-tabs.js, equipment-data.js and app.js renderers.
- Tabs: Optimizer, EXP Sources, Gear Setups.
- Whole-account, save-based recommendations rather than basic combat advice.
- Tier ordering considers practical ease, F2P access, conditions and time gates. Long projects get their own lane.
- Source list distinguishes additive vs multiplicative sources, evaluated vs unmodeled data.
- Gear should use owned or realistically farmable items.
- Further decoding is desired, but user paused EXP to build individual world pages. Do not resume unrelated EXP work without current direction.

**Jelly Operator**
- engine.js, app.js, solver-worker.js, audit/test files.
- Existing substantial simulator/optimizer/practice tools. Preserve them.
- Jelly has its own workspace tabs and account bonus evaluation.

## Save handling / correctness
- User imports full JSON or data-only JSON using Home/Change local save.
- For big exports use Open JSON/TXT. Earlier pasted attachment was truncated; do not reuse it as a complete account.
- state.rawData is the inner save; state.rawRoot is full export, including companion and charNames.
- Fields may already be arrays/maps OR JSON strings. Parse carefully, support verified export aliases.
- Character arrays commonly have suffixes (e.g. Lv0_0).
- Null/missing must stay distinct from zero, locked and completed.
- A displayed base bonus is not automatically the fully amplified account bonus.
- Keep imports local. Do not log or send the full save elsewhere.
- Saved data is a snapshot, not a live connection to the game.
- Browser currently has a loaded export, but a new session may not retain tool bindings or UI state. Inspect before assuming it is empty or asking for another upload.

## Authoritative local research/assets
Installed game client:
C:\Users\Sofia\Documents\ChatGPT\Idleon\audit\N.js

Installed assets archive:
C:\Users\Sofia\Documents\ChatGPT\Idleon\Idleon resources\app.asar

Extraction scripts: extract-client.js, extract-construction-assets.js, extract-cog-assets.js, extract-worship-assets.js, extract-lab-assets.js, extract-world4-assets.js.
These extract actual assets and catalog data from default.pak/client code. Reuse existing sprites before extracting new ones.

N.js is large/minified. Use targeted Node substring searches; never dump the whole file.
Catalogs are often ja.NAME=function(){return[...]}; extract/evaluate only the bounded catalog in vm, not the full client.
Number2Letter uses the underscore sentinel at index0, then lowercase alphabet (and uppercase after); preserve verified indexing.

Existing audit docs: AUDIT.md, BONUS-AUDIT.md, CLASS-EXP-AUDIT.md, COOKING-AUDIT.md.
Consult source and tests before changing formulas; old handoff assumptions can be stale.

## Development and verification workflow
1. Read current files and inspect target page.
2. Extend its existing pattern; avoid a redesign.
3. Separate decoder/math from rendering where practical.
4. Test actual edge cases (missing records, aliases, bounds, unlocks, rounding, special indices).
5. Run relevant tests, then npm test as appropriate; node --check for changed JS; git diff --check.
6. Verify in the actual localhost browser: saved values, pagination, hover/click, closing details and compact fit.
7. Report what works and what still requires manual inputs. Do not claim automatic math that is not implemented.
8. No need to ask approval for routine local edits already requested.

Browser:
- Use the available computer-use/browser tooling and its documentation.
- Last IAB URL http://localhost:3000/. Old tab handle was tab; do not assume bindings survive a new chat.
- Source changes/local reload may return to Home. Reopen collapsed World group and target page.
- Do not change/clear the user's loaded save for testing. Use synthetic Node fixtures for destructive/missing-data cases.
- Verify wide numerical strings do not overflow compact tiles. Cooking previously needed stacked time/ladle lines to prevent horizontal overflow.


