(function(root){
'use strict';
// Verified against local N.js SHA256 49a106e5ea60bd6eb3ec36173b7f43720a2805329d1fe08a4fada822c617165c.
// Evidence: ../audit/gold-watch-code-evidence.txt. Flag OptionsListAccount[315] gates exclusions.
const rows=[
 ['General','Shop stock','yes','Restocks normal shops.'],
 ['General','Minigames, teleports and instant revive','yes','Refreshes daily plays and revive; adds daily teleports subject to their cap.'],
 ['General','Guild and merit tasks','yes','Runs daily task refresh and applicable daily guild contribution.'],
 ['General','Gem-shop daily limits','partial','Resets selected purchase counters only. Some purchase limits are explicitly excluded.'],
 ['General','Weekly resets','no','Does not advance the weekly reset or refresh weekly allowances.'],
 ['General','AFK production','no','Does not grant 24 hours of general production, kills or skill progress.'],
 ['General','Active events','no','Gold watches cannot be consumed while the game reports an active event.'],
 ['World 1','Stamps','yes','Gilded Stamp roll, Hydrogen accumulation and unlocked automatic stamp levels.'],
 ['World 1','Picnic Stowaway','yes','Resets the daily quest chain.'],
 ['General','Boss keys, Colosseum tickets and timed minibosses','yes','Advances the relevant day counters. Claim requirements still apply.'],
 ['General','Hoops and Darts','yes','Resets daily attempt/use counters.'],
 ['World 2','Alchemy','yes','Vial attempts, daily liquid-shop counters, Boron clicks, No Bubble Left Behind and unlocked daily bubble grants.'],
 ['World 2','Post Office','yes','Processes daily orders, Beryllium conversion and unlocked daily box grants.'],
 ['World 2','Weekly boss daily retry','yes','Refreshes the daily retry flag for the current boss. Does not reset weekly progress.'],
 ['World 2','Island day counters','yes','Advances island bottles, trash and crystal-related daily counters, subject to caps.'],
 ['World 3','Armor Smithy wait','no','Does not advance the 30-day wait for the free permanent set-bonus unlock.'],
 ['World 3','Jeweled cogs','yes','Resets the daily pull counter; does not generate ordinary production time.'],
 ['World 4','Cooking and Breeding','yes','No Meal Left Behind, Sapphire Pyramite kitchen upgrades, spice-claim counter and Pet Arena availability.'],
 ['World 5','Sailing','yes','Refreshes captain offers and advances the Gold Relic sample-age counter.'],
 ['World 5','Gaming snail mail','yes','Grants the daily mail amount with unlocked modifiers.'],
 ['Caverns','Lamp wishes','no','Does not grant daily lamp wishes.'],
 ['Caverns','Motherlode layers','no','Does not reset the daily layer-break allowance.'],
 ['Caverns','Cavernous Echoes','no','Does not reset the daily lantern-use allowance.'],
 ['World 6','Farming instagrows','yes','Grants daily instagrows from the purchased upgrade.'],
 ['World 6','Summoning','yes','Resets lives to 3 and advances the familiar-cost cycle by one day.'],
 ['World 6','Sneaking','yes','Refreshes daily revives and resets the charm-roll counter.'],
 ['World 6','Emperor attempts','yes','Grants daily attempts subject to the attempt-stacking cap.'],
 ['World 7','Spelunking page reads','yes','Resets the daily page-reading allowance.'],
 ['World 7','Spelunking Biggest Haul','no','Does not grant the daily amber haul.'],
 ['World 7','Coral Reef','yes','Grants daily Reef gains when the relevant system is enabled.'],
 ['World 7','Research observation rolls','no','Does not replenish observation rolls.'],
 ['World 7','Minehead attempts','no','Does not replenish daily attempts.'],
 ['World 7','Jelly attempts and blood cells','no','Does not replenish daily attempts or grant daily blood cells.'],
 ['World 7','Research tiny cogs','no','Does not generate daily tiny cogs.'],
 ['World 7','Research stacking bonuses','no','Does not add daily growth to the first-three-masterclass cost reduction or Spelunking power bonus.'],
 ['Masterclasses','Royal Guardian resource nodes','no','Does not restock depleted resource nodes.'],
 ['Masterclasses','Daily discounted purchases','yes','Resets the used-purchases counter for the daily masterclass discount. Separate from the Research stacking bonus.'],
 ['Masterclasses','Tesseract drops','yes','Resets daily weapon and ring drop flags.'],
 ['General','Daily ribbons','yes','Runs daily ribbon generation with your unlocked modifiers.'],
 ['General','Wish item','no','Does not reset its once-per-day use restriction.']
];
// Silver changes only ShopRestock by +/-900 seconds; it does not set the gold exclusion flag.
const silverOverrides={
 'Gem-shop daily limits':['partial','Runs the normal daily purchase-counter reset, including counters skipped by gold watches. Weekly and other independently timed purchases keep their own rules.'],
 'Weekly resets':['partial','The client weekly day counter advances when a daily reset occurs; silver does not add the compensating day that gold does. Weekly actions still require their weekly boundary, and server-timed rotations do not fast-forward.'],
 'AFK production':['no','Moving the reset timer does not grant AFK production, kills or elapsed skill time.'],
 'Active events':['partial','Silver watches are allowed by the item handler during events. A triggered daily reset refreshes daily event counters; it does not change the server event schedule.'],
 'Armor Smithy wait':['yes','Advances the day counter toward the 30-day free permanent set-bonus unlock.'],
 'Lamp wishes':['yes','Grants the normal daily lamp wishes, including the applicable random rounding.'],
 'Motherlode layers':['yes','Resets the daily layer-break counter.'],
 'Cavernous Echoes':['yes','Resets the daily lantern-use counter.'],
 'Spelunking Biggest Haul':['yes','Grants the normal daily amber haul when Biggest Haul is unlocked.'],
 'Research observation rolls':['yes','Refills observation rolls to the daily allowance.'],
 'Minehead attempts':['yes','Refills attempts to the daily allowance.'],
 'Jelly attempts and blood cells':['yes','Raises attempts to at least the daily allowance, retaining a larger balance, and adds daily blood cells.'],
 'Research tiny cogs':['yes','Generates daily tiny cogs when unlocked and space is available.'],
 'Research stacking bonuses':['yes','Adds the daily Research growth to the first-three-masterclass cost reduction and Spelunking power bonus.'],
 'Royal Guardian resource nodes':['yes','Runs normal restocking when the required Armory upgrade is unlocked. Only depleted nodes marked empty qualify; partially drained nodes do not refill.'],
 'Wish item':['yes','Resets the once-per-day use flag. Does not undo permanent completion of the wish.']
};
const silverRows=rows.map(([world,name,status,note])=>[world,name,...(silverOverrides[name]||[status,note])]);
const labels={yes:'Resets / grants',no:'Does not reset',partial:'Conditional'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(host){
 let watch='gold';
 host.innerHTML=`<section class="pocket-watches"><header class="section-head compact"><div><p class="eyebrow">Misc · Reset guide</p><h2>Pocket Watches</h2><p>Know what refreshes before spending a watch.</p></div></header>
 <div class="pw-intro"><article><img src="assets/Quest77.png" alt="Gold Pocketwatch" width="42" height="42"><h3>Gold Pocketwatch</h3><p>Triggers a special daily reset. Your normal reset time stays the same, and weekly resets do not advance.</p><p>Use your available daily attempts and purchases first. Unlock requirements and caps still apply.</p></article><article><img src="assets/Quest76.png" alt="Silver Pocketwatch" width="42" height="42"><h3>Silver Pocketwatch</h3><p>Moves your daily reset time by 15 minutes per watch.</p><p><strong>Left two inventory columns:</strong> 15 minutes later.<br><strong>Right two columns:</strong> 15 minutes earlier.</p><p>This changes your reset schedule. Crossing the timer boundary triggers a normal daily reset.</p></article></div>
 <nav class="skill-tabs pw-tabs" aria-label="Pocketwatch type"><button type="button" class="skill-tab active" data-pw-watch="gold" aria-pressed="true">Gold Pocketwatch</button><button type="button" class="skill-tab" data-pw-watch="silver" aria-pressed="false">Silver Pocketwatch</button></nav>
 <p class="pw-note" id="pwNote"></p>
 <div id="pwSilverGuide" hidden><h3>Triggering a daily reset with silver</h3><p>A silver watch changes the timer by 15 minutes. Rewards only refresh once the timer reaches zero and the game processes the reset.</p><p>To bring a reset closer, use watches from the <strong>right two inventory columns</strong>. For example, with 40 minutes remaining, two watches leave 10 minutes; a third crosses zero and triggers the reset on the next game tick. Your next reset will then be about 23 hours 55 minutes away.</p><p>A full 24-hour timer takes 96 watches to cross. Near your normal reset, far fewer are needed. Let each reset finish before starting another cycle; use available attempts and collect rewards between cycles.</p></div>
 <div class="pw-controls"><label>Search systems<input id="pwSearch" type="search" placeholder="Research, Alchemy, Jelly…" aria-controls="pwRows"></label><label><span id="pwEffectLabel">Gold-watch effect</span><select id="pwFilter" aria-controls="pwRows"><option value="all">All effects</option><option value="yes">Resets / grants</option><option value="no">Does not reset</option><option value="partial">Conditional / partial</option></select></label></div>
 <p id="pwCount" role="status" aria-live="polite"></p><div class="pw-table-wrap"><table><thead><tr><th scope="col">System</th><th scope="col" id="pwEffectHeading">Gold watch</th><th scope="col">What happens</th></tr></thead><tbody id="pwRows"></tbody></table></div><p id="pwEmpty" hidden>No matching systems. Try another search or effect.</p>
 <details class="pw-verification"><summary>Verification and scope</summary><p>Checked against the local game-client snapshot dated September 18, 2026. This is a reference list of verified effects, not a live check of your account or a guarantee for later game updates.</p><p>The gold watch marks the reset as watch-triggered. The normal reset then skips a dedicated group of rewards before processing the remaining dailies. Gem-shop limits are selective; do not assume every daily purchase refreshes.</p></details></section>`;
 const search=host.querySelector('#pwSearch'),filter=host.querySelector('#pwFilter');
 const update=()=>{const silver=watch==='silver',activeRows=silver?silverRows:rows,terms=search.value.toLowerCase().trim().split(/\s+/).filter(Boolean),visible=activeRows.filter(r=>(filter.value==='all'||r[2]===filter.value)&&terms.every(t=>r.join(' ').toLowerCase().includes(t)));
 host.querySelector('#pwNote').textContent=silver?'The list below applies after silver watches trigger a normal daily reset, not after every watch. This includes Research rolls, Jelly attempts and qualifying Royal Guardian nodes. Your reset schedule changes.':'Gold watches skip several newer daily systems, including Research rolls, Jelly attempts and Royal Guardian nodes. They are blocked during active events.';
 host.querySelector('#pwSilverGuide').hidden=!silver;
 host.querySelector('#pwEffectLabel').textContent=silver?'Silver-triggered reset effect':'Gold-watch effect';
 host.querySelector('#pwEffectHeading').textContent=silver?'At daily reset':'Gold watch';
 host.querySelectorAll('[data-pw-watch]').forEach(button=>{const selected=button.dataset.pwWatch===watch;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});
 host.querySelector('#pwRows').innerHTML=visible.map(([world,name,status,note])=>`<tr><th scope="row">${esc(name)}<small>${esc(world)}</small></th><td><span class="pw-status pw-${status}">${labels[status]}</span></td><td>${esc(note)}</td></tr>`).join('');host.querySelector('#pwCount').textContent=`${visible.length} of ${activeRows.length} systems`;host.querySelector('#pwEmpty').hidden=visible.length>0;};
 host.querySelectorAll('[data-pw-watch]').forEach(button=>button.onclick=()=>{watch=button.dataset.pwWatch;update();});
 search.oninput=update;filter.onchange=update;update();
}
root.PocketWatches={render};
})(window);
