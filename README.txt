# Sovixxa’s Idleon Planner

Run `npm start` here, or double-click `start.bat`. Open http://localhost:3000.
No npm install is needed. Edit the files in this folder; source changes hot reload.

Paste a fresh full export, then choose an objective and search quality. Max clear
chance is the default. The solver compares unlocked Fevers and Stronkroid timing,
uses independent final-evaluation seeds, and includes partial and defensive boards.
Quick/Normal/Deep use 32/96/256 runs per finalist. This is a bounded heuristic search,
not a proof of the globally best layout. Failed attempts are ranked by remaining
boss HP at the END of Critical, not just damage at the normal timer.

Search and purchase planning run in a cancellable browser worker. Drag the sample
run slider to inspect square deaths and core losses. This one replay is illustrative;
use the multi-run statistics for the recommendation. Plan next purchase compares
affordable moves; if none exist, it can estimate a damage-upgrade saving target.
Saving targets hold cell levels and the layout fixed and are not guaranteed to be
the cheapest path. EXP gains and other future upgrades may reduce the required cost.

Privacy: the export is parsed only in your browser, with no upload or backend storage.
Saving the pasted export across hot reloads is opt-in sessionStorage. The game archive
and example export are ignored by Git. No game files or private saves are bundled into
the web app.

`npm test` runs engine, search, UI wiring, and combat regressions. If ../audit/N.js is
present, it also compares the extracted Jelly formula function with this engine.
See AUDIT.md for findings, evidence locations, and remaining uncertainties.
