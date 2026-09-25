# Dailies and weeklies audit — 2026-09-25

## Research and scope

Expanded the original 11 reminders to 58 activities: 28 daily, 11 weekly, and 19 timers/collections (including four stacking minibosses). This is a broad routine catalog, not a claim that every activity is unlocked, useful, or automatically decoded for every account. Optional entries can be hidden individually and restored. Missing counters remain unknown.

Cross-checked the [routine checklist](https://incendar.com/idleon-daily-routines.php), [Slush](https://idleon.wiki/wiki/Dilapidated_Slush), [Mush](https://idleon.wiki/wiki/Mutated_Mush), [Magmus](https://idleon.wiki/wiki/Domeo_Magmus), and [Spiritlord](https://idleon.wiki/wiki/Demented_Spiritlord) references against the local installed game client (`../audit/N.js`) and the local Toolbox parsers (`../.tmp-idleon-toolbox/parsers` and `utility/dashboard/account.js`).

Important corrections to older routine lists:

- Stacking minibosses are accumulated daily-login counters, not weekly reset flags or wall-clock cooldowns.
- The free companion is now a daily cooldown; older lists still say weekly. The local companion parser documents the unchanged server anchor formula and its new 23-hour effective deadline. This dashboard leaves its actual claim status manual because the server is authoritative.
- Collection tasks and class talents have independent cooldowns. They are grouped under Timers instead of being represented as guaranteed daily resets.
- Weekly Battle's daily attempt flag differs from its weekly highest skull tier.

## Verified save mappings

| Activity | Field | Interpretation |
| --- | --- | --- |
| Vial attempts | `CauldronP2W[5][0]` | Attempts remaining |
| Vial unlocks | `CauldronInfo[4][id]` | Positive level means discovered; not necessarily maxed |
| Lore | `OptionsListAccount/OptLacc[410]` | Reads used; no invented remaining cap |
| Research | `Research[7][2]` | Observation rolls remaining |
| Minehead | `Research[7][8]` | Daily attempts remaining |
| Jewel Cogs | options `[414]` | Pulls used; cap is bonus-dependent |
| Tournament | options `[496]`, `[511]` | Saved tournament day vs registered-through day |
| Weekly Battle | options `[190]`, `[189]` | Daily attempt flag vs best skull tier this week (5 max) |
| Killroy | options `[113]`, `[227]` | Used room digits; third-room unlock. With that unlock, remaining = 3 minus used rooms. Without it, only used rooms are shown because earlier room unlocks must also be established. |
| Boss gems | options `[195]` | Remaining gem-paying kills from the 600-budget/4 formula |
| Random event | options `[137]` | Daily event flag |
| Top of the Mornin' | options `[365]` | Remaining kills (does not itself prove the feature is unlocked) |

Numeric fields preserve missing/null/empty/malformed data as unknown; zero is a real saved value. Indicators describe the snapshot only, and never auto-tick personal checkboxes.

## Miniboss formulas

Directly verified the installed client's spawn expressions, including clamps/caps:

| Boss | Option | Formula for saved counter d | Cap | Two-spawn threshold |
| --- | --- | --- | --- | --- |
| Dilapidated Slush | 96 | floor(max(0,d-3)^0.55) | 10 | d = 7 |
| Mutated Mush | 98 | floor(sqrt(max(0,d-3))) | 8 | d = 7 |
| Domeo Magmus | 225 | floor(sqrt(max(0,d-3))) | 6 | d = 7 |
| Demented Spiritlord | 226 | floor(sqrt(max(0,d-3))) | 6 | d = 7 |

The page flags 2+ spawns, shows the current quantity/cap, and displays remaining logged-in daily resets to two. It never adds browser elapsed time to the save. A personal miniboss check is associated with its saved counter and reopens when a newly imported counter changes. Unknown-counter reminders fall back to daily manual checks.

## Automatic relevance and persistence

Vial attempts auto-hide only if **every named live vial** in the bundled catalog has a known positive saved level. Level 13 is not required. A single missing/zero level prevents hiding. The generated `dailies-data.js` currently contains 86 IDs; `build-dailies-data.js` regenerates them from the bundled vial catalog during the static build, so catalog updates are reflected.

The Hidden view distinguishes "All vials unlocked" from "Hidden by you". Automatic hiding can be disabled; personal hidden choices can be restored one at a time. Other permanent-completion rules are not guessed. All preferences are keyed by the first character name when available; unnamed exports explicitly share browser-local settings. Existing saved checks migrate without losing their timestamps. The Dailies storage key is included in planner backups.

Daily reset: configurable local hour. Weekly reset: configurable UTC weekday/hour, default Thursday 00:00 UTC, consistent with the [current dashboard's weekly schedule](https://idleondashboard.com/). These schedules reset personal checks, not game data. Timer reminders use the daily personal schedule unless they are snapshot-bound miniboss checks.

## Validation

- `node test-dailies-model.js`: all four spawn boundary tables/caps, two-spawn trigger, unknowns, incomplete/complete vial saves, manual/automatic hiding, weekly boundary, Killroy counters, fresh-counter reopening.
- `node test-dailies.js`: actual app navigation, tabs, counters, Hide/Restore, automatic vial hiding and override, persistence, account isolation, links, desktop/mobile layout, no browser errors.
- `node test-planner-qol.js`: existing reset, snapshot, account isolation, and backup validation.
- `node build-static.js`: static output and referenced assets.

Remaining manual areas include server-backed pet/raid claims, precise cooldown projections, world/feature unlock eligibility, Post Office shipments, and bonus-dependent daily maxima. These say "Check in game" or show used counts rather than fabricating readiness. No external notifications or background monitoring were configured.


## Save-driven filtering and compact layout — 2026-09-25

The default Daily/Weekly/Timers views now contain only activities with confirmed readiness. Undecoded reminders have their own **Needs checking** view; they are not called complete. **All** shows unfiltered active reminders, and **Filtered** explains every excluded item. Manual checks also leave the main list immediately. Automatic filtering can be disabled in settings.

Additional rules verified against local parsers/client:

- Research uses the highest Research level (`Lv0_N[20]`) across a complete named roster. Eligible observation count is zero before level 1, one before finding the first observation, otherwise `min(43, 5*floor((level+10)/10) - floor(level/20) - floor(level/30) - floor(level/50))`. Hide rolls when every eligible `Research[2]` entry is found. A higher skill level with newly missing observations brings the task back. A partial roster cannot establish this ceiling.
- Lore remaining reads use the installed client's 5 + 3 mastery limit. Spelunking levels are `Lv0_N[19]`; the relevant mastery requires Rift 15 and 500 total levels. Without sufficient mastery data, eight used reads alone safely establishes exhaustion.
- Jewel Cog limit is `1 + 2*Spelunk[18][18]`, from the local client Legend talent 18 (Cog Lover), compared with options 414.
- Post Office completion flags are `PostOfficeInfo0[i][2]`; all six shipment rows must be present to establish a remaining-order count.
- Summoning attempts are `Summon[3][0]`; Shimmer completion is options 182, gated on its island letter in options 169.
- Pet Mart gems use saved tournament global S versus options 516; raid registration uses global RD versus 611. Free companion availability compares the documented anchor deadline with saved GlobalTime, never the current browser clock.
- A known `extraData.currentWorld` filters later-world activities. Rando/Shimmer use their actual island letters. Exhausted charm/symbol rolls, zero remaining counters, completed flags, a five-skull Weekly Battle, and sub-two miniboss counts are filtered.

The workspace `example json.txt` regression has Research level 85, all 38 eligible observations found, and 12 otherwise unusable rolls. It filters 16 completed/unavailable activities and shows six confirmed daily tasks. This is a snapshot assessment, not live game state. Thirty-six remaining entries cannot be confirmed from the implemented rules and stay under Needs checking.

Compact cards are two columns on desktop and one on mobile, with details collapsed. Browser checks cover checkbox removal/undo, auto-filter overrides, account isolation, all hidden reasons, and the workspace save at 1440px and 390px widths.

## Needs-checking JSON audit — follow-up

The earlier 6-ready / 16-filtered / 36-unknown totals above are superseded. The same workspace export now produces **13 ready (10 daily, 2 weekly, 1 timer), 22 filtered, 23 unverified**. Thirteen formerly unverified reminders are resolved. No private export contents were copied into a fixture or generated catalog.

Verified rules and local source references:

| Activity | Saved evidence / rule | Reference |
| --- | --- | --- |
| Guild daily / weekly | `Guild[1..5]` / `[6..9]`, catalog ID at 0, progress at 2; compare each catalog requirement | Toolbox `parsers/guild.ts`, `shared-data.json: guildTasks` |
| Daily world tasks | `TaskZZ1[world][8]`, zero means unfinished; W1–W6 only, gated by exported world | Toolbox `parsers/tasks.ts`, dashboard `getGeneralAlerts` |
| Picnic start | Full roster NPC dialogue >=20; no completed quest among Picnic_Stowaway4..12 | Toolbox dashboard `characters.js: questsAlerts` |
| Keys / tickets | Pickup counters 16/31/80 and 15/35/56; NPC dialogue strictly above unlock thresholds, or all counters zero | Toolbox `parsers/misc.ts: enhanceKeysObject`, `enhanceColoTickets`, `getAmountPerDay` |
| Traps | Full roster `PldTraps_N`, ignore -1 slots; elapsed at 2 >= duration at 6 | Toolbox `parsers/world-3/traps.ts: parseTraps` |
| Stored library books | Options 55; deliberately excludes projected offline production | Toolbox `parsers/misc.ts: calcBookCount` |
| Sailing chests | `SailChests` entries; renamed to match the checked scope, does not claim to check captain purchases or returning boats | Toolbox `parsers/world-5/sailing.ts: getChests` |
| Familiars | `Summon[0][2]` reaches current catalog max 25 | Toolbox `summoningUpgrades.json`, dashboard summoning rule |
| Divinity unlinks | `Divinity[38]` remaining; optional action, not advice to change links | Installed game unlink button checks and decrements this field |
| Island collections | Trash days 160, dock bottle days 170, Crystal Island days 171; island letters gate applicable checks | Installed game island collection / spawn handlers; Toolbox islands parser |
| Tiny Cogs | Automatically placed in empty cog inventory slots during daily reset; no manual claim | Installed game `TinyCogsPerDay` reset loop |
| Charm / symbol drops | Options 402 counts automatic qualifying loot rolls, not a manual roll action; 120/75 limits | Installed game Ninja loot generation and Toolbox sneaking parser |

The example confirms 3 unfinished daily guild tasks, 3 weekly tasks, 6 unfinished daily boards, 10 characters able to start Picnic, 3 island collections, 2 unlinks and 624 stored books. Keys/tickets are collected, traps have not reached their duration, sailing chest storage is empty, and Familiar is maxed. Tiny Cogs and charm/symbol rolls are excluded because they happen automatically. Eligibility under a cap is not affordability: unmaxed Familiar upgrades remain unverified until their full essence cost is calculated.

Every remaining unknown now has a specific limitation in Details. These include undecoded flags (sewer kills, Spikes, Rando), bonus-dependent calculations (Arcade, worship, crystal allowance), combined systems needing separate rules (construction, cooking, breeding), current server state (Happy Hour, ballot, Tome), and player targets (shop purchases, giant farming, crop overgrowth). They remain unverified, not falsely completed or silently hidden. The Tome can additionally be conclusively filtered when its saved period is inactive or all seven tiers were claimed in the matching saved month.

Regression coverage includes exact trap and NPC boundaries, missing characters, malformed traps, unknown guild catalog IDs, partial task boards, zero counters, locked-world precedence, maxed/unmaxed familiars, automatic actions, and real-export counts. The browser test verifies Details, both weekly rows, 10 daily rows, all 23 unknowns, persistence, navigation, and compact mobile layout.
