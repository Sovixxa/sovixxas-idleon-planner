# Prayer calculation sources

The activity dashboard also uses these GPL-3.0-only parsers and the pure account/character alert calculations in `utility/dashboard`. Its interface, settings integration, worker adapter, and timer presentation are local implementations. Rebuild `dashboard-math.js` with `npm run build:dashboard-math`; its entry, build script, defaults, and this source directory are included in the static distribution. Local dashboard adaptations (2026-09-28) replace date-fns helpers with native date arithmetic and correct the Wraith Form active-buff membership check. Dashboard calculations are anchored to the imported save timestamp and run locally in a separate worker.

The prayer-math-engine.js calculation bundle derives from [Idleon Toolbox](https://github.com/Morta1/IdleonToolbox), licensed GPL-3.0-only. The original license is included as LICENSE. This directory contains the calculation sources and data used to build the bundle; prayer-math-entry.ts and build-prayer-math.js are included alongside the published bundle.

Local changes (2026-09-23):
- Removed UI imports and disabled UI-only dynamic service loading from utility/helpers.js. Those functions are not used by the calculation bundle.
- Replaced the date-fns isPast call with its native Date comparison equivalent.
- Included the project's custom prototype helpers inside the isolated calculation worker; modern browser built-ins supply the other polyfills.
- Exported getPrinterSampleRate, preserving its unrounded value before applying the game’s 90% cap.
- Corrected Class EXP prayer lookups to use activePrayers and the account argument, including the no-prayers superbit path.

Build from the repository root with `npm install` followed by `npm run build:prayer-math`. The checked-in bundle is used by static builds, so visitors do not need build tools. Calculations run locally in a Web Worker; no account JSON is sent to another service.

The integration in prayer-model.js compares complete prayer sets. The local installed game client was used to check the prayer level formula, empty-loadout superbits, Wizard slot thresholds, gem purchase index, monster HP, curse floors, sample cap, Unending Energy cap, shiny bundles/chance divisor, minigame plays and Glitterbug spawn divisor. This is a derived calculation, not execution of the live game. See PRAYER-MATH-AUDIT.md for scope and regression coverage.
