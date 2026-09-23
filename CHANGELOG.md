# Project changelog

## 2026-09-23 - Planner quality-of-life tools

- Added favorite pages and keyboard quick search (Ctrl/Cmd+K) for pages and imported bonuses.
- Remember page filters, character selectors, tabs, sidebar groups, and the last visited page.
- Added page notes alongside the existing general notepad, with a mobile position that leaves the toolbar accessible.
- Added manual and save-tracked goals, a Home goal summary, and recurring daily/weekly tasks with configurable local reset times.
- Added save age, import comparisons for decoded progression, and per-page hiding of recognized completed entries.
- Added downloadable personal settings backups with validated, previewed restore, including the notepad and Account Review plan.
- Settings stay in this browser; import comparisons start with a baseline and use later imported saves.

## 2026-09-20 - Beanstalk bonus audit

- Added a Misc → Pets page showing the complete companion catalog, owned copies, upgraded state, borrowed companion, and active base/upgraded bonus.
- Corrected companion decoding to use upgraded bonuses, include the borrowed companion slot, and apply the full Anniversary card cap.
- Calculates the in-game **Total Golden Food Bonus** directly from the imported save. No manual value is required. The calculation includes character-specific equipment, talents, bubbles and signs plus account stamps, achievements, Sigils, meals, charms, Bribes, Ballot, companions, event cards, Legend talents, Vault and Research sources.
- Shows the highest character value in the summary and the calculated value for every character, matching the fact that several Golden Food sources are character-specific in the game.
- Added current and next-tier values for every Golden Food using the audited logarithmic Beanstalk formula, including the gain from the next 10K/100K/1M milestone.
- Listed all 24 multiplier-source groups referenced by the client and documented the Secret Class/King Doot outer multiplier so missing sources remain visible instead of silently becoming zero.
- Added regression coverage for serialized Ninja deposits, quantity/tier saves, formula values, tier boundaries and runtime multiplier handling.

## 2026-09-20 - v0.9.8: static stamp catalog and collapsible worlds

- Added a local 128-stamp catalog grouped into Combat, Skills, and Misc. Every
  entry includes its game artwork, name, effect, saved level, locked state, and
  a hover/focus detail card.
- Added collapsible sidebar world and account groups.

## 2026-09-20 - v0.9.7: skill information baseline

- Restored Research, Coral, and Nametags/Trophies as separate World 7 pages.
- Restyled supporting-system tabs as a clear in-page section bar.
- Added baseline “how it works,” tracked data, and planner-purpose information to
  every current skill, system, game, and account page.

## 2026-09-20 - v0.9.6: nested skill systems

- Moved supporting systems into tabs inside their related skill page: Farming →
  Night Market, Sneaking → Jade Emporium, Smithing → Forge & Anvil,
  Construction → Refinery and 3D Printer, Worship → Tower Defense, Breeding →
  Pet Arena, Gaming → The Hole, and Research → Coral and Nametags/Trophies.
- Kept the sidebar focused on primary skills while preserving direct, clear access
  to every related system through its parent page.

## 2026-09-20 - v0.9.5: full account system navigation

- Expanded world navigation beyond core skills to include each world’s major
  production systems and games: Forge/Anvil, Stamps, Post Office, Arcade, 3D Printer,
  Tower Defense, Pet Arena, Rift, The Hole, Jade Emporium, Night Market, Research,
  Coral, and Nametags/Trophies.
- Added account-wide game pages for Cards/Codex, Obols/Statues, Dungeons, Equinox,
  Tome/Slab, Guilds, and Challenges/Events.

## 2026-09-19 - v0.9.4: complete skill navigation map

- Restored Mining and Chopping to World 1 and Fishing to World 2, while retaining
  Loadout Optimizer as a cross-skill comparison tool.
- Added the previously omitted World 3 Trapping page. Every current planner skill is
  now represented under its respective world before detailed implementation begins.

## 2026-09-19 - v0.9.3: useful character home

- Replaced generic Home summary counters with named character cards from the save.
  Cards show class glyphs, level, target, current activity classification, and saved
  AFK duration.

## 2026-09-19 - v0.9.2: individual world skill navigation

- Replaced grouped world pages with individual skill pages in their respective
  worlds, from Smithing in World 1 through Minehead and Spelunking in World 7.
- Moved Mining, Chopping, and Fishing into a dedicated Misc Loadout Optimizer page,
  ready for their shared future gear, card, talent, and gains comparison.

## 2026-09-19 - v0.9.1: isolated world pages

- Removed Jelly Operator status and planning data from Home. Home now contains only
  account and character activity information.
- Consolidated each world into one navigation page. World 1 now groups Mining,
  Smithing, and Chopping for its future shared loadout optimizer; Worlds 2 through 7
  follow the same isolated structure.

## 2026-09-19 - v0.9.0: account home and world navigation

- Reframed the tool as an account planner with a left-side world navigation and a
  Home dashboard. It reads all saved character AFK targets, AFK durations, class IDs,
  and levels from a full local export.
- Grouped future skill areas by world and retained Jelly Operator as the active,
  audited module. Unbuilt skill entries stay visibly unavailable instead of implying
  unsupported game calculations.

## 2026-09-19 - v0.8.1: support-aware search and capped auto-training

- Added Organelle-first support layouts, which deliberately fill its buff ring with
  high-output shapes before timed validation. The search also preserves candidates
  that activate Cells of Three.
- Made the Cells of Three effect visible as effective cell counts and added an
  Auto-until-reliable trainer mode. It stops on a 99% simulated clear rate or after
  60 attempts, whichever happens first.

## 2026-09-19 - v0.8.0: self-play trainer and local playbook

- Added repeated local self-play generations that feed each winning layout into the
  next search, then retain the best validated strategy.
- Added a browser-local playbook keyed to the boss and legal board. Remembered
  layouts seed later optimizer and trainer runs; they can be exported or forgotten
  from the Self-play trainer panel.

## 2026-09-19 - v0.7.9: compact next-purchase plan

- Rebuilt Plan next purchase as a dense recommendation card: action, cost, current
  funds, projected timed outcome, and the reason for the recommendation are visible
  together.
- Removed the projected post-upgrade board and its duplicate operation timeline from
  the planner. The full optimizer remains the place to inspect layouts.

## 2026-09-19 - v0.7.8: deeper board search and upgrade roadmap

- Expanded Deep search to a larger candidate pool, 8-run screening, independent
  32-run elite rechecks, and 384-run final validation. This reduces lucky short-run
  promotions before layouts become finalists.
- Split Upgrade optimizer from Bonuses & cells. Upgrade rows now rank marginal board
  damage, Bloodcell multiplier and cost, while retaining one-off and board-changing
  unlocks with explicit re-optimization guidance.
- Added regression coverage for the upgrade roadmap and verified both new tabs in the
  local app.

## 2026-09-19 - v0.7.7: tabbed workspace and clean save loading

- Split the loaded workspace into Optimizer, Practice game, and Upgrades & bonuses
  tabs while retaining the operation state at the top.
- Hide and clear the large JSON editor after a successful local parse. A compact
  Change local save control restores it only when a replacement export is needed.
- Verified tab transitions and the loaded-save cleanup in the live local app.

## 2026-09-19 - v0.7.6: draggable cells and live practice playback

- Replaced the editor's cell selection flow with an unlocked-cell drag palette. Drop
  a sprite on a board square to attempt a legal placement; the click editor remains
  available for add, move and remove.
- Added Play/Pause operation playback and changed practice status to show live time
  and boss HP instead of the final result at time zero.
- Rechecked the supplied client operation loop: per-tick charge/Stronkroid, projectile
  impact, timer/Critical ordering, and manual revive behavior are reflected by the
  shared engine used for practice and optimization.

## 2026-09-19 - v0.7.5: editable practice board

- Added Add, Move and Remove controls to the no-risk practice board.
- The editor exposes only unlocked cell types and validates every edited layout using
  the real client footprints, board slots, overlap restrictions and Virus cap.
- Removing or moving any part of a multi-square cell applies to the whole shape, then
  immediately reruns the exact same combat simulation on the edited board.

## 2026-09-19 - v0.7.4: interactive practice operation

- Added a no-risk practice operation to the local web app. It uses the current or
  recommended layout and the pasted save's decoded levels, bonuses, Fever and skills.
- Players can choose an unlocked Fever, trigger simulated Stronkroid at the selected
  time, and click a dead square to use a simulated Revival Shot.
- Manual actions are frame-addressed and run through the same combat loop as the
  optimizer. They do not consume attempts or alter any save data.

## 2026-09-19 - v0.7.3: coordinated layout refinement

- Added a bounded local placement search after mix discovery and during mutation.
  It moves one legal shape at a time to improve the actual static cell-combat model.
- This gives promising mixes a deliberate pass over Organelle adjacency, Virus
  infection, Proximity cores and support placement before expensive timed screening.
- Added tests proving refinement stays legal, preserves the selected mix and never
  reduces structural combat score. The supplied-save live check reached 50.0% median
  remaining boss HP in the latest normal search; results remain seed-sensitive.

## 2026-09-19 - v0.7.2: exact revive timing

- Confirmed from the operation UI handler that Revival Shots are immediate clicks on
  a dead board square, with no game-imposed delay.
- Made zero seconds the best-outcome default and applied it in the same simulation
  update. The revive reaction control remains available for conservative estimates.

## 2026-09-19 - v0.7.1: optimizer coverage and search improvements

- Rechecked the extracted JellyOperation branch list and call sites for missed combat,
  EXP, Bloodcell, slot, Fever, Stronkroid, revive, and plot-related bonus paths.
- Confirmed the optimizer simulation handles the eight playable cell roles: Amoeba ramp,
  Plasmid/Ribosome passives, Organelle adjacency, Immunoid Critical shielding, Virus
  infection, Mito speed, and Gigacyst damage.
- Reviewed candidate generation and finalist validation. The search creates legal
  full/partial layouts, relocates existing cells, keeps Immunoid shield lanes, compares
  unlocked Fevers, and validates finalists with timed Monte Carlo simulation.
- Wired the existing Quick/Normal/Deep `shortlist` quality setting into candidate
  screening breadth instead of relying on fixed shortlist constants.
- Added bounded role-aware layout seeds for Proximity, Organelle adjacency, Virus
  infection, and Immunoid shielding, while keeping final ranking based on timed runs.
- Added support-lane preservation so Organelle, Virus, Proximity, and shield-heavy
  candidates survive static proxy ranking long enough to be simulated.
- Ran `npm test`; all engine, search, account-bonus, and extracted-client audit checks passed.

## 2026-09-19 - v0.7.0: cell and account bonus audit

- Audited all eight cell passives, attacks, cached adjacency/infection, and incoming account bonus dependencies in the supplied game client.
- Added Active bonuses and all-cell reference panels with current layout hit/interval ranges and explicit missing-input status.
- Added Bloodcell economy factors, daily attempts and transfusion decoding. These are informational, not an operation-income forecast.
- Corrected COLD's DPS Biometrics requirement; companion exact upgrade/borrowed/Divinity gates; exact bundle ownership flag.
- Added regression coverage for account edge cases and source formula comparisons for all eight cells and mixed passive stacks.
- Recorded source anchors, formulas, export values and verification limits in BONUS-AUDIT.md.


## 2026-09-19 — v0.6.1: visible automatic layout search

- Added automatic optimization when a fresh JSON is loaded; the checkbox can disable it.
- Search now explicitly relocates existing shapes as well as deleting/refilling cells
  and generating different mixes. It keeps the client's fixed shapes and flat-index legality.
- Added live candidate-board previews and preliminary metrics during simulation.
- Added three tested alternative boards and placement-change counts so a current-board
  win does not look like the optimizer did nothing.
- Every new search explores a fresh seed. The previous best layout remains a finalist,
  evaluated on the same final seed set, so a rerun can continue improving it.
- Added remaining-attempt display, cancellable background search, and a sample-run
  slider showing square destruction and dead cores.
- Restored the live local server after the browser was left in static mode. Verified
  localhost serves engine v0.6.1-live-search.

## 2026-09-19 — v0.6.0: client audit and operation optimization

- Extracted N.js from the supplied app.asar for a local audit; game resources and the
  example export are ignored by Git and are not served as application assets.
- Fixed Cellular Warfare: its multiplier is separate from Destruction and Palette.
- Fixed projectile launch jitter: only base offsets scale by 18; jitter is already pixels.
- Corrected Research[7][10] from successful operations to remaining attempts.
- Normalized attack/target order to ascending anchor index, matching the client loop.
- Added defensive search lanes, timed mutation search, unlocked Fever comparisons,
  and separate training/final seed sets for Stronkroid timing.
- Rank unsuccessful boards by boss HP after the full attempt, including Critical.
- Show tested clear probability, its approximate confidence interval, and remaining HP.
- Added purchase comparisons and a greedy multi-upgrade saving target when no combat
  purchase is affordable. This is a tested estimate, not a cheapest-path guarantee.
- Added direct comparison tests against the extracted client formulas. See
  idleon-jelly-optimizer-v052/AUDIT.md for source evidence and remaining uncertainties.

## 2026-09-19 — v0.5.3: local development and initial fixes

- Kept the existing editable v0.5.2 project and actual game sprites.
- Moved the local server to port 3000 and added npm start / npm test scripts.
- Fixed missing next-move HTML elements that broke JSON loading.
- Cached fixed account damage inputs once per simulation instead of parsing them per shot.
- Added partial-board support, fair current-board comparisons, and visible core markers.
- Made raw JSON session storage opt-in.

## Verification notes

Engine and source-audit tests cover placement quirks, seeded comparisons, partial boards,
integer startup behavior through the inherited implementation, EXP leveling, Immunoid
priority and delay, in-flight hits after core death, all 72 boss parameters, the first
40 upgrade records, and representative cell formulas across all six Fevers.

Search is heuristic and simulations still need observed in-game timing validation.
No clear was found for the supplied Obstruction 23 save in the tested samples. The
optimizer reports that honestly and can show a stronger failed attempt or a progression
target rather than invent a winning layout.

Browser verification: loading the supplied export auto-started search; live candidate
previews appeared; a completed result changed the board from 27 to 35 cells in one
run. Three alternative boards, the death slider, purchase planning, and cancellation
were exercised with no browser console errors. Counts vary by search seed.
