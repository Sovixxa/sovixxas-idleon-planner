# Sovixxa’s Idleon Planner

This has grown into an account planner: Home reads character activity from a full
local export, while Jelly Operator remains the currently audited simulator. The left
navigation organizes planned skill modules by world; unavailable items are not yet
modeled or simulated.

Home is account-only. Each world has one page that groups its connected skills; for
example, World 1 combines Mining, Smithing, and Chopping for a future shared loadout
and gains optimizer. Jelly Operator remains separate under World 7.

The sidebar keeps every skill on its respective individual world page. Mining,
Chopping, and Fishing also appear in the Misc Loadout Optimizer, a separate
cross-skill comparison surface. The map includes the previously omitted Trapping page
in World 3.

Run `npm start` here, or double-click `start.bat`. Open http://localhost:3000.
No npm install is needed. Edit the files in this folder; source changes hot reload.

Paste a fresh full export, then choose an objective and search quality. Max clear
chance is the default. The solver compares unlocked Fevers and Stronkroid timing,
uses independent final-evaluation seeds, and includes partial and defensive boards.
After it discovers a strong cell mix, it also performs bounded legal local placement
refinement so adjacency, infection and Proximity arrangements are deliberately tested.
Quick/Normal/Deep use 32/96/256 runs per finalist. This is a bounded heuristic search,
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
