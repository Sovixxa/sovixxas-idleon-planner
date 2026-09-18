IDLEON JELLY OPERATOR OPTIMIZER — LOCAL LIVE BUILD v0.4.1

RUN
1. Keep this whole folder together.
2. Double-click start.bat.
3. Your browser opens http://127.0.0.1:8787
4. Paste a full IdleOn JSON or data-only JSON.
5. Parse JSON, then Optimize timed clear.

FRESH PROGRESS
Paste a new JSON any time you unlock cells, plots, upgrades, levels, Fever choices, etc.
The parser rebuilds the Jelly state from the new export each time.

PRIVACY
The web app and simulation run locally. Your pasted IdleOn JSON is not posted anywhere.
The only web server is 127.0.0.1 on your own machine. If "Preserve pasted JSON during local hot reloads" is checked, the pasted text is stored only in browser sessionStorage for that tab so source-code reloads do not erase it.

TIMED MODEL
The optimizer targets operation clear reliability/time, not static DPS. It models:
- operation timer and obstruction HP
- randomized initial cell attack progress
- attack cooldowns and projectile travel
- Amoeba Immuno Weakening stacks on projectile hit
- Organelle adjacency speed
- Virus infected-slot damage
- cell-type passive multipliers and Cells of Three
- Fever damage/speed effects
- Critical Condition square-by-square boss kills
- exact multi-square rule: a cell keeps attacking until its ANCHOR square dies
- Immunoid squares are targeted first and impose the shipped 3x boss-attack delay
- Stronkroid 5-second speed burst; when unlocked the solver searches press timing
- Revival Shots as a manual-click model with configurable reaction delay

Account-wide Jelly damage sources outside the Research blob are collapsed into a calibration multiplier. You can anchor timing to a fresh observed clear with your current board; otherwise the app falls back to saved best Jelly DPS.

LIVE DEVELOPMENT
The local Node server uses hot reload. If index.html, app.js, engine.js, styles.css, or an asset changes in this folder, the browser automatically reloads while preserving your pasted JSON in that browser tab.

IMPORTANT ABOUT FUTURE CHATGPT CHANGES
ChatGPT cannot directly edit a folder after it has been copied onto your PC. For truly automatic future updates without re-downloading ZIPs, this project needs a connected Git repo. start-live-git.bat is already built for that: once this folder is a clean Git checkout, it polls git pull every 3 seconds and the browser hot-reloads when changes arrive.


VISUAL BUILD
The board uses the actual Jelly Operator sprites and obstruction art extracted from the shipped client. The recommendation is spatial: you can copy the shown layout rather than translating letters/numbers.

NEXT-MOVE PLANNER
After the main timed-layout search, the app compares affordable combat upgrades and board-expansion options. If Another Unlock / a plot credit is available, it searches the unowned plots, re-optimizes the board, and highlights the recommended new plot in green.
