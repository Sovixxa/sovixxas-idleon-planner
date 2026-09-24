# Arena and spice recommendations

Breeding now has Arena Setup and Best Spices tabs in addition to the existing
arena rewards and shiny planner. Arena offers ordered 2–6 pet compositions,
timing instructions and a fast Peapeapod battle alternative. Species are unique
within a combat team. Spice plans cover early Targeter chains, regular collection,
focused production and fight-power recovery.

Recommendations are curated presets, not a combat simulator or an exhaustive
optimum. Current saved pet power selects copies within each ability. A pet cannot
be allocated twice within a spice plan; focused rows reserve their copies first.
Missing copies are hatch goals; locked species are unlock goals. Reassignments
show the source (storage, Fenceyard or territory) and never modify the save.
Post-change fight power and spice/hour are not calculated.

`ProgressionModels` supplies the worker-safe species, inventory, ability and
territory snapshot. It handles `OptLacc` and `OptionsListAccount`, excludes the
arena placeholder between Pristalle Lake and Nebulon Mantle, and excludes
unreleased species. `breeding-team-data.js` contains territory names from the
vendored Toolbox catalog; the final two entries use battle names because that
catalog does not provide territory names for them.

Sources reviewed September 24, 2026:

- User sheet, published tab 893917212 (read via published CSV; image-only cells
  are not included in the CSV):
  https://docs.google.com/spreadsheets/d/e/2PACX-1vSCepYAs6sNDP4iq6MJNAG1pvFXzfC_3IQ7ttt5vfEEKAgQhIk4cQqnLRyeH6UyqDSuP4R-6WQeDmmP/pubhtml#gid=893917212
- Recent regular collection and focused-spice discussion:
  https://www.reddit.com/r/idleon/comments/1rbgjhk/spice_gain/
- Arena scaling composition:
  https://www.reddit.com/r/idleon/comments/18vqvoz/
- Monolithic / Defender / double Refiller combat alternative:
  https://steamcommunity.com/app/1476970/discussions/0/4029095281633124640/
- Local client-derived `WORLD4_CATALOG.PetGenes` and vendored breeding catalogs
  for ability descriptions, Converter reset/non-stacking behavior and species.

Tests cover arena slot thresholds, unique combat species, inventory allocation,
missing copies, adjacent-row dependencies, worker save mapping, navigation,
lineup/strategy controls and desktop/mobile overflow.
