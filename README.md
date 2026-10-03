# Sovixxa’s Idleon Planner

A local account planner with compact pages for world systems, account bonuses,
characters, quests and collections. Load a full export on Home, then select a
system from the sidebar. Related systems use internal tabs. Jelly Operator in
World 7 includes the audited combat simulator and layout optimizer.

Run `npm start` here, or double-click `start.bat`. Open http://localhost:3000.
No npm install is needed. Edit the files in this folder; source changes hot reload.

World 3 → Library shows the saved talent book cap, its seven contributing
sources, ordinary book range, checkout balance, and estimated next checkout and
5/20/40/60 checkout milestones. It explains class/VIP books and the Automation
Arm's guaranteed maximum-level checkout. Timers use the save timestamp and
saved bonuses; overdue forecasts ask for a refreshed save. Run
`npm run test:library` for calculation and desktop/mobile browser checks.
The Library also expands every Library-specific Summoning multiplier, including
The Winz Lantern, Crystal Comb, W6 merits/achievements, Godshard, King of All
Winners, and the Daydreamer Pack. Pack ownership and with/without comparisons
use the imported save and do not double-count the bonus. Minimum-roll and
checkout-speed sections name their sources and show the Fortune Cookie meal
multipliers. Library-cap calculations exclude Emperor/Endless winner multipliers
as required by the game client's separate Library Max formula.

World 6 → Summoning → Next Purchase Optimizer plans up to 1,000 purchases from
saved essence balances. Choose a bonus goal, affordable or future purchases,
an essence color, and a budget percentage; repeat upgrades can be collapsed.
The planner picks the cheapest matching level within each currency, rotating
between currencies, and includes unowned prerequisites. It recalculates internal
discounts, doublers and stone bonuses after purchases. Outside discounts and the
doubler talent are not decoded; prices are estimates with an optional calibration
multiplier. Plans do not modify the save or simulate battle outcomes. Run
`npm run test:summoning` for model and desktop/mobile checks; when the local game
client is available, model tests also compare costs and bonuses to its handler.

All Account Bonuses shows compact purple, searchable stat tiles for the selected character
and account. The example export has 103 totals: combat stats, skill EXP, activity
AFK gains, food effects, per-slot capacities, construction and world-system rates.
Calculation workers are reused for the same imported save; stat categories appear
together after loading. Popup breakdowns are built on demand, and source filters
reuse the character catalogue rather than recalculating it.
Click a tile or catalogue bonus for an Arcade-style lower-right popup; Close or
Escape returns focus. Full ledgers preserve source pools and calculation rules.
Calculated totals include source pools or expandable calculation steps showing
input values, multipliers, caps and intermediate dependencies. Breakdowns use
collapsible calculation pools with numeric values sorted highest to lowest inside
each pool; original stages, units and calculation dependencies remain intact.
When a source list is present, the full trace is collapsed separately. Explicit
operations take precedence over stage labels; mixed expressions stay intermediate
calculations rather than being guessed as independent multipliers. STR/AGI/WIS/LUK
show an independent reconstruction of equipment, obols, flat sources, percentage
pools and post-multiplier additions alongside the exact saved number. Differences
remain explicitly unreconciled; no residual is invented as a bonus. Stat snapshot
levels can differ from the character levels elsewhere in the same export.
Cooking uses saved active presets; capacities use the saved map; sample rate is
capped at 90%. Underneath, all decoded source systems remain collapsible, with
calculated stamp and bubble values. Related-benefit grouping matches descriptions
and is a browsing aid, not an exact dependency graph or a combined stat sum.
Run `npm run test:connected-bonuses` for calculation and browser checks.
After changing traced parser formulas, regenerate the separate worker engine with
`node build-connected-trace.js`. The builder uses esbuild and Playwright's bundled
Babel parser (`PLAYWRIGHT_PATH` can override the local Playwright package path).
The generated engine is checked in; normal builds do not require regeneration.

Use **Connect account** for Steam or Idleon email/password sign-in. Steam opens
the official Steam sign-in page; copy the resulting Idleon `/steamsso/` address
back into the connection dialog without pressing the blue button on that page.
The planner exchanges it with Idleon's sign-in service and listens for cloud-save
changes. Updates are available only when the game saves to the cloud.

Home refreshes automatically when you are not editing. Other pages queue the
latest save behind **Apply update**, preserving your open planner until you choose
to refresh. Applying waits for the Jelly optimizer to finish. Notes, goals and
checklists stay in local storage. The connection bar shows receive/apply times,
errors, retry, and disconnect. Importing valid JSON or clearing a save disconnects
cloud sync. Disconnect keeps the displayed save available locally.

Sign-in tokens last for the current browser tab, including reloads. Passwords and
Steam redirect URLs are not stored by the planner. The Firebase SDK is loaded from
Google's CDN only on connection or session resume; cloud data and sign-in go
directly to Idleon's services. Manual JSON import requires no Firebase connection.
See `CLOUD-SYNC.md` for integration details and verification limits.

Dailies is a save-driven activity dashboard: world groups show available claims,
attempts and collections, with a separate miniboss spawn watch. Search and world
filters narrow the view. Needs checking separates unverified readiness from
confirmed actions; Finished / unavailable explains exhausted counters and locks.
There are no manual completion ticks or assumed reset countdowns. Applying a newer
save refreshes the dashboard. Hidden activities remain account-specific; old
checklist marks are preserved in storage but no longer suppress ready activities.
Run `npm run test:dailies` for save rules and desktop/mobile browser checks.

Optimizers → Account Review generates specific actions from the existing upgrade
calculators: next-action stamp prices and inventory blockers, fully funded
single-click bubble purchases, meal upgrades covered by saved stock, refinery
supply drains and auto-refine blockers, named finished buildings and stamp
hand-ins. Cards start collapsed with the predicted source-bonus gain visible. Expand for
save evidence, cost/stock and requirements. Large numbers use K/M/B/T suffixes.
Bubble previews evaluate the full minimum one-click level change; stamp cap
payments show zero immediate effect and a separate preview for buying the unlocked
levels afterward. Percent-bonus deltas are percentage points, not final stat gains.
The worker shares stamp and bubble decoding helpers with their dedicated pages
and parses the account once for all four calculation adapters. Missing calculation
data suppresses advice instead of substituting generic benchmarks.

Choose a goal in Next steps; use My Plan to save actions and Account checks for
reference milestones and unlock coverage. Goal matching uses effect descriptions.
Prices apply independently to each alternative, not to a funded combined shopping
list; refresh after purchases. Rankings do not claim gain per hour. Bubble targets
show the minimum gain from one click; shared-cap and atom decisions remain in the
dedicated optimizer. Cooking actions here consume already-saved meal stock.
Missing stamps require saved item possession or an active regular reward quest
before becoming collection candidates. Unavailable, rare-random and unverified
sources remain reference entries. Run `node test-account-review.js`,
`node test-account-review-actions.js`, and `node test-account-review-browser.js`.


Paste a fresh full export, then choose an objective and search quality. Max clear
chance is the default. The solver compares unlocked Fevers and Stronkroid timing,
uses independent final-evaluation seeds, and includes partial and defensive boards.
After it discovers a strong cell mix, it also performs bounded legal local placement
refinement so adjacency, infection and Proximity arrangements are deliberately tested.
Quick/Normal/Deep use 32/128/384 runs per finalist. This is a bounded heuristic search,
not a proof of the globally best layout. Failed attempts are ranked by remaining
boss HP at the END of Critical, not just damage at the normal timer.

The Practice operation is a no-risk, deterministic sandbox: it reads the loaded
export's current cell levels, unlocked Fever choices, Stronkroid and Revival Shots,
but never spends game attempts or changes the export. Move its time slider, select a
dead square and use the available simulated active skills.
The practice-board editor can add an unlocked cell at a legal anchor, remove a full
placed shape from any of its squares, or move a placed shape. Edited boards are
validated with the client's footprint, unlocked-slot, overlap and Virus-limit rules
before the operation is simulated.

The unlocked-cell palette supports drag and drop: drag a sprite to a board square to
place its core there. Play advances a visible deterministic replay at six simulated
seconds per real second; the timeline and board show the current operation state.

After loading a save, use the Optimizer, Practice game and Upgrades & bonuses tabs to
keep each activity focused. The pasted JSON is removed from the page after parsing;
use Change local save to load a different export.

Deep search uses a larger candidate pool, role-aware placement refinement, an
independent intermediate recheck of the strongest candidates, then 384-run finalist
validation. The Upgrade optimizer separates immediate board damage and Bloodcell
multiplier math from one-time unlocks, which are clearly marked for re-optimization.

Search and purchase planning run in a cancellable browser worker. Drag the sample
run slider to inspect square deaths and core losses. This one replay is illustrative;
use the multi-run statistics for the recommendation. Plan next purchase shows one
compact recommendation with its cost, funds, outcome, and reason; if no purchase is
affordable, it can estimate a damage-upgrade saving target.

The Self-play trainer runs multiple local optimizer generations and stores validated
layouts in a browser-local playbook for the same boss and legal board. Playbook
entries seed later searches and can be exported as JSON or forgotten from the Trainer
panel. It does not send game data or interact with the real game.

Cells of Three is modeled exactly as an extra effective passive count for every full
group of three non-Virus cells. Cell cards show those effective counts whenever the
perk is active. Auto until reliable stops when the final simulated clear rate reaches
99%, or after 60 self-play attempts if no reliable clear is found.
Saving targets hold cell levels and the layout fixed and are not guaranteed to be
the cheapest path. EXP gains and other future upgrades may reduce the required cost.

Privacy: the export is parsed only in your browser, with no upload or backend storage.
Saving the pasted export across hot reloads is opt-in sessionStorage. The game archive
and example export are ignored by Git. No game files or private saves are bundled into
the web app.

`npm test` runs engine, search, UI wiring, and combat regressions. If ../audit/N.js is
present, it also compares the extracted Jelly formula function with this engine.
See AUDIT.md for findings, evidence locations, and remaining uncertainties.

Crystal Cove includes a save-backed upgrade optimizer under The Hole. Choose a
goal and either Buy now or Long-term roadmap; filter by shape, compress adjacent
purchases, and track purchases with a persistent checklist. Rankings use marginal
goal gain per fraction of imported shape balances, with two-purchase discount
lookahead. They do not estimate farming time or guarantee a global optimum.
Drop-rate comparisons hold imported shape digits and kill counts fixed. Run
`npm run test:cove`, `npm run test:cove-client` (local audit/N.js required), and
`npm run test:cove-browser` for the model, client parity and browser checks.

Alchemy opens the cap-aware Bubble Upgrade Optimizer. It covers all 133 non-placeholder
bubbles, using the installed client growth curves and audited shadow-cap evidence.
Choose a 90%, 95% or 99% soft target and the matching-class context. The worker
calculates the saved Prisma multiplier; colour multiplier bubbles are applied where
relevant, with the Carpenter exception. Undeveloped Costs includes the decoded
Barley Brew contribution. Unresolved character-dependent shared pools require a
check and do not become automatic upgrade targets. The original collection is
available from Bubble collection.

The upgrade list prioritizes account growth and the gap to the selected checkpoint;
it does not optimize material spending. “Capped” describes the named effect in the
selected context, not all possible benefits of total bubble levels. Soft ceilings
are not hard caps. Planned marks are local and do not modify game data.
Run `npm run test:bubbles` and `npm run test:bubbles-browser` for formula boundaries,
installed-client curve parity, real-save Prisma decoding and browser interaction.

Stamps now opens an upgrade optimizer with adjustable soft targets, audited Arcade
shadow caps, shared sample-rate warnings and a ranked next-action list. Material
payments require one character to carry the whole amount. Capacity uses actual
empty inventory slots and matching stacks at the W1 vendor, with an optional
reserve of extra free slots. It distinguishes clearing inventory from exceeding
the best empty inventory, and treats equipment as one item per slot. Coin levels
are checked separately and do not require material capacity. Material gates are
not permanent level caps. Costs cover only the next action, using the saved
reducer without assuming Gilded Stamps. Run `npm run test:stamps` and
`npm run test:stamps-browser` for model, real-save and browser validation.

The September 27 bonus refresh checks the public game client, adds the Jelly
Tome metric, corrects Tome unlocks and late-game progress, and updates all 178
companion records. Set `IDLEON_CLIENT_PATH` to a freshly downloaded audit client
and run `npm run test:live-bonuses` to repeat the catalog and formula checks.
See [BONUS-FRESHNESS-2026-09-27.md](BONUS-FRESHNESS-2026-09-27.md) for sources,
regeneration commands, validation scope and remaining limits.

The [September 28 follow-up](BONUS-FRESHNESS-2026-09-28.md) fixes empty borrowed
pet fields granting Doot, aligns shared Arcade calculations with Reindeer's
actual client behavior, and adds the Bloodcell entry to that calculation engine.
After rebuilding the bundle, reapply `node build-companion-math.js <client-path>`;
the full test suite and live-bonus checks include its regression coverage.

The [third bonus audit](BONUS-FRESHNESS-2026-09-28-THIRD.md) corrects five
Divinity gods' major/minor link mappings while preserving blessing and cost
rows. `test-divinity-client.js` checks the actual client handler and tooltip
lookup; `node test-divinity-browser.js` checks the rendered god details.

The activity dashboard supports all 97 groups in the supplied dashboard config:
45 account groups, 16 character groups (expanded per character), and 36 timers.
All groups are enabled initially; the supplied alert options and thresholds are
retained. Customize trackers includes every option, item selection, material
targets, and settings import/export. Preferences are local to each account.
Calculations run in a local worker, anchored to the save timestamp. An elapsed
countdown asks for a fresh save instead of inventing a new claim or reset.
Missing data is shown explicitly. Run `npm run test:dashboard` for coverage,
real-save calculations and browser checks, and `npm run build:dashboard-math`
to regenerate the calculation bundle. GPL calculation-source attribution and
local modifications are documented in `vendor/idleon-toolbox/README.md`.
