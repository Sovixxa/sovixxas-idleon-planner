# Connected Bonuses audit — 2026-09-28

Scope: the 103 displayed totals in the example export, grouping and ordering, source popups, and desktop/mobile layout.

Fixed:
- Explicit multipliers in a Base stage were incorrectly grouped as Base. Operation metadata now takes precedence.
- Capped/rounded output rows were treated as rules instead of final totals. Output identity now takes precedence.
- Mixed formulas containing a multiplication were labelled multipliers without evidence that they were independent factors. These stay intermediate calculations.
- Named Cap pools were missed by classification.
- Source-ledger HTML emitted an extra closing brace.
- Zero-valued catalogue contributions were replaced by status text.
- Source ledgers and full traces occupied duplicate space; full traces now start collapsed when a ledger is available.

Layout: purple backgrounds, borders, text accents and controls; 66px desktop tiles (previously 102px minimum), 64px mobile tiles; 6px grid gaps; character/search controls share a row when space permits. Repeated tile subtitles moved to hover descriptions. Focus indicators and keyboard-accessible details remain.

Validation: pool regression cases include explicit-operation precedence, true-multiplier labels, capped outputs, mixed formulas, negative values and immutable descending sorting. Formula parity covers 759 character totals and 30 account totals against the original engine. Browser audit checks all stat popups for nonempty collapsed pools, descending values and stray markup; exercises expansion, filtering, character changes, navigation, Escape/close and mobile overflow.

Limits: this validates the app's decoded coverage, not an independent inventory of every bonus in the live game. STR/AGI/WIS/LUK now include independently calculated source reconstructions. These do not exactly reconcile with saved totals and are explicitly marked; tests of unchanged displayed totals do not establish upstream formula correctness. True multipliers are identified only where source metadata says so. Inputs with no decoded operation remain Inputs; sorted raw values are not a ranking of marginal impact across different units. Source catalogue benefit matching remains description-based.


Primary-stat follow-up: the installed game calls TotalStats for STR/AGI/WIS/LUK when saving PVStatList. The new model uses the installed formula ordering (equipment amplification; obol amplification; base additions; combined additive percentage pool; post-multiplier alchemy and talents; floor). Golden Grilled Cheese Nomwich is the AllStatz food, not Golden Cake (DropRatez). These are different effects and the regression test protects that lookup. The example AGI snapshot is 31,166,367; its independent reconstruction remains different and is labelled unreconciled. The example character also carries level 1700 in StatList and level 1717 in Lv0; this supports treating these as separate snapshots but does not prove the cause of the whole discrepancy. No balancing bonus is inserted to force equality.
