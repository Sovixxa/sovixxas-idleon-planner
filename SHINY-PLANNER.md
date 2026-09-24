# Shiny breeding planner

Breeding → Shiny Pets shows species-level saved levels, current/per-level bonuses,
general progression tiers and a staged recommendation. The existing aggregate
bonuses remain available below the list. Tiers and levels 2/5/10/15 are editorial
planning benchmarks, not game unlocks or a calculated return-on-time optimizer.
The existing breeding engine models shiny levels through level 20.

Data: `ProgressionModels` serializes pet records from the existing breeding model.
Raw `Breeding[22 + world][indexInWorld]` presence distinguishes unknown from zero;
`Breeding[1][world]` is the species unlock count. Released W1–W4 species only:
the upstream catalog also includes `_` placeholders, which are excluded.
No save is modified. No ETA or verified talent readiness is claimed.

Mechanics checked against the local client `audit/N.js`: Enhancement Eclipse
level 150 sets `TalENHNC[362]`; talent 362 is Whale Wallop. Its enhancement text
states that Beast Master kills have a 50% chance to reduce incubator time by
3 seconds. The community explains the associated Fenceyard/shiny progression:
https://www.reddit.com/r/idleon/comments/1kx254y
https://gameslikefinder.com/article/idleon-wind-walker-build-guide/
Checked September 24, 2026. The guide separates the kill trigger from whale casts
and active farming from an offline AFK kill estimate.

Validation: `node test-shiny-planner.js`, `node test-shiny-browser.js`,
`node test-progression-pages.js`, `node test-world4.js`.
