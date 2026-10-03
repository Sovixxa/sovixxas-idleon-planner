(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=v=>String(v??'').replaceAll('_',' ');
const fmt=v=>v.toLocaleString('en-US',{maximumFractionDigits:2});
const odds=p=>Number.isFinite(p)&&p>0?(p>=1?'1 in 1':p>.995?'≈ 1 in 1':`1 in ${fmt(1/p)}`):'Unavailable';
const adjusted=(chance,dr)=>Number.isFinite(dr)&&dr>0?Math.min(1,chance*dr):null;
let catalog,selected='',query='',monster='all',page=0,orbScore=0;
const math=root.TrueDrMath||(typeof require==='function'?require('./true-dr-math'):null);
const tables=root.TrueDrTables||(typeof require==='function'?require('./true-dr-tables'):null);
function rowsFrom(data,monsters={},maps=[]){
 const grouped=new Map();
 for(const [source,drops] of Object.entries(data)){
 const raw=tables.monsters[source]||[],primary=raw.slice(0,4).find(r=>r[3]==='N/A'&&r[0]!=='COIN'&&!r[0].includes('Cards'))?.[0];
 const dungeon=Object.keys(tables.monsters).indexOf(source)<Object.keys(tables.monsters).indexOf('fm_rat');
 for(const d of drops){
 if(d.rawName==='COIN'||d.Type==='CARD'||/^(Dung|EquipmentDungeon)/.test(d.rawName)||!(Number(d.effectiveChance??d.chance)>0))continue;
 const key=[source,d.rawName,d.recipeItem||'',d.talentName||'',d.talentLevel||''].join('|');
 const path=d.dropTablePath||[],route=[];let entries=raw,valid=true;
 for(const name of path){const index=entries.findIndex(r=>r[0]===name);if(index<0){valid=false;break;}const r=entries[index];route.push({key:String(index),id:r[0],chance:Number(r[1]),quantity:Number(r[2]),quest:r[3]});entries=tables.tables[name]||[];}
 const special=/SmithingRecipes|TalentBook/.test(d.rawName);
 const matches=entries.map((r,index)=>({r,index})).filter(({r})=>r[0]===d.rawName&&Number(r[1])===Number(d.chance)&&r[3]===d.questLink&&(special||Number(r[2])===Number(d.quantity)));
 if(matches.length){const {r,index}=matches[0];route.push({key:String(index),id:r[0],chance:Number(r[1]),quantity:Number(r[2]),quest:r[3],itemId:Number(d.ID)});}else valid=false;
 if(!grouped.has(key))grouped.set(key,{icon:d.rawName,item:clean(d.recipeItemName||d.displayName||d.rawName)+(d.talentName?' · '+clean(d.talentName):''),monster:clean(d.monsterDisplayName||source),source,quantity:Number(d.quantity)||1,primary:d.rawName===primary&&d.Type==='MONSTER_DROP',world:Math.floor(maps.indexOf(source)/50),hp:Number(monsters[source]?.MonsterHPTotal),defence:Number(monsters[source]?.Defence),special,candy:/PremiumGem|Timecandy/.test(d.rawName),nested:path.length>0,crystal:source.startsWith('Crystal'),quest:d.questLink&&d.questLink!=='N/A'?clean(d.questLink):'',routes:[],unsupported:dungeon?'Dungeon loot':monsters[source]?.Type!=='Monster'||monsters[source]?.AFKtype!=='FIGHTING'?'Special source':/^(cave|rift|fm_rat|w7a6)/.test(source)?'Dynamic monster stats':null});
 const row=grouped.get(key);if(!valid)row.unsupported='Unverified table path';else for(const match of (special?matches.slice(0,1):matches)){const alternative=[...route.slice(0,-1),{...route.at(-1),key:String(match.index)}];if(!row.routes.some(r=>JSON.stringify(r)===JSON.stringify(alternative)))row.routes.push(alternative);}
 }
 }
 for(const row of grouped.values()){const base=math.evaluate(row.routes,1);row.chance=base?.chance||0;}
 return [...grouped.values()];
}
function diminished(v){if(v>=250)return 98.14+(v-250)/50;if(v>=200)return 95.6+(v-200)/20;if(v>=150)return 90.6+(v-150)/10;if(v>=100)return 80.6+(v-100)/5;if(v>=50)return 47.3+(v-50)/1.5;if(v>=20)return 20+(v-20)/1.1;return v;}
function multikill(row,loot){
 if(!row.primary)return 1;
 if(!loot||!Number.isFinite(loot.damage)||!Number.isFinite(loot.accuracy)||!(row.hp>0)||!Number.isFinite(row.defence)||row.world<0||row.world>6)return null;
 const exponent=row.world===6?5:2,hp=row.hp*(loot.hpMultiplier??1);
 if(!loot.unlocked||loot.damage<exponent*hp||loot.accuracy<=1.5*row.defence)return 1;
 let tiers=1;for(let i=0;i<50;i++)if(loot.damage>=hp*exponent*Math.pow(exponent,i+1))tiers=i+2;
 const base=loot.base,perTier=loot.perTier[row.world];if(!Number.isFinite(base)||!Number.isFinite(perTier))return null;
 const total=row.world===6?diminished(base)+tiers*diminished(perTier):base+tiers*perTier;
 return Math.max(1,1+Math.floor(total)/100);
}
function dropResult(row,dr,loot){
 if(row.unsupported)return {reason:row.unsupported};
 if(row.special)return {reason:'Book / recipe unlock rules'};
 if(!Number.isFinite(dr)||dr<=0)return {reason:'Import a save'};
 if(row.crystal&&!Number.isFinite(loot?.crystalRolls))return {reason:'Crystal stats unavailable'};
 const multi=multikill(row,loot);
 const branches=math.iterations(row.source,loot||{}).map(([iterations,weight])=>({weight,...math.evaluate(row.routes,dr,loot||{},{iterations,savedGates:!!loot,materialMulti:multi??1})}));
 const result={chance:0,mean:0};
 if(row.special){result.quantity=result.chance>0?1:0;result.mean=result.chance;}
 if(multi===null)return {...result,chance:branches.reduce((sum,b)=>sum+b.weight*b.chance,0),quantity:null,reason:'Multikill unavailable'};
 // Main-material direct rolls are integers. Apply the native ceil after multikill.
 for(const b of branches){result.chance+=b.weight*b.chance;result.mean+=b.weight*b.mean;}
 result.quantity=result.chance?result.mean/result.chance:0;
 const stack=math.stackBonus(row.icon,loot||{});result.stack=stack;
 result.quantity*=stack.factor;result.mean*=stack.factor;
 return result;
}
function quantityPerDrop(row,dr,loot){return dropResult(row,dr,loot).quantity??null;}
async function render(host,raw){
 const token={};host.trueDrRequest=token;
 const current=()=>host.trueDrRequest===token&&host.dataset.page==='trueDr';
 host.innerHTML='<section class="carry-empty"><h2>True DR</h2><p role="status">Loading drop tables and saved character drop rates…</p></section>';
 try{
 const [data,result]=await Promise.all([catalog?Promise.resolve(catalog):Promise.all(['monsterDrops','monsters','shared-data'].map(name=>fetch('vendor/idleon-toolbox/data/website-data/'+name+'.json').then(r=>{if(!r.ok)throw new Error('Could not load drop tables.');return r.json();}))).then(([d,m,shared])=>catalog=rowsFrom(d,m,shared.mapEnemiesArray)),root.DropRate.calculate(raw)]);
 if(!current())return;
 const chars=result.characters;if(!chars.some(c=>String(c.id)===selected))selected=String(chars[0]?.id??'');
 host.innerHTML=`<section class="loadouts-page true-dr-page"><div class="section-head compact"><div><h2>True DR</h2></div></div><div class="loadout-controls"><label>Character<select id="trueDrCharacter">${chars.length?chars.map(c=>`<option value="${c.id}" ${String(c.id)===selected?'selected':''}>${esc(c.name)} · ${Number.isFinite(c.normal)?fmt(c.normal)+'×':'Unavailable'}</option>`).join(''):'<option>No imported characters</option>'}</select></label><label>Monster<select id="trueDrMonster"><option value="all">All monsters</option>${[...new Set(data.map(d=>d.monster))].sort().map(m=>`<option ${monster===m?'selected':''} value="${esc(m)}">${esc(m)}</option>`).join('')}</select></label><label>Search drops<input id="trueDrSearch" type="search" placeholder="Item or monster…" value="${esc(query)}"></label><label>DK Orb score<input id="trueDrOrb" type="number" min="0" step="1" value="${orbScore}" title="Live Orb score is not exported. Leave at 0 when inactive. Outside W5+ Colosseum."></label></div><p id="trueDrStatus" class="loadout-note"></p><details class="true-dr-help"><summary>Calculation details</summary><p>Odds are the chance of receiving at least one item per normal active kill. Avg / drop is the average total quantity on kills that drop the item, combining all loot paths. Each rare-table entry is rolled separately, with its own stack size, rounding and Rares Everywhere bonus. Crystal rolls include the saved Crystal Embiggener multiplier. DK Orb uses the score entered above (outside W5+ Colosseum); zero means inactive. Saved Gimme Gimme uses the native roll priority. Golden food and statues include the Autumn pack’s ×2 stack bonus, Tesseract / Palette / Big Fish or Statue Metallurgy / linked Kattlekruk doubling chance, Legend Talent proc strength and the statue Spelunking upgrade. Fractional proc chances are averaged; they do not increase the chance of receiving an item. Main materials use eligible multikill, including world and miniboss Death Note ranks, W7 diminishing returns and prayer HP penalties. Saved Wraith Form uses Death Bringer’s Grimoire damage and accuracy. Death Bringer family / kill-per-kill bonuses credit more kills; they do not multiply ordinary item stacks. Wraith bone drops and Graveyard Shift are separate from these item tables. Base odds use 1× DR and no character bonuses. Gems and candies use their separate scaling. Books and recipes have encoded rewards and unlock rules and are marked unmodeled. Quest, stamp, recipe and storage eligibility is checked where exported. Dungeon, skilling and dynamic-stat sources are marked unmodeled. Results exclude AFK claims, giants, other live class loot effects, map-dependent changes to saved stats and dynamically added loot.</p></details><div id="trueDrRows" class="true-dr-grid" aria-label="Item drops"></div><div class="shadow-caps-pager"><button type="button" class="secondary" id="trueDrPrev">Previous</button><span id="trueDrCount" role="status"></span><button type="button" class="secondary" id="trueDrNext">Next</button></div></section>`;
 function paint(){
 const ch=chars.find(c=>String(c.id)===selected),dr=ch?.error?null:ch?.normal;
 host.querySelector('#trueDrStatus').textContent=!chars.length?'Import your account JSON from Home to calculate adjusted odds.':ch?.error?`${ch.name}: ${ch.error}`:`Normal active kill · ${fmt(dr)}× normal drop rate. Orb score: ${fmt(orbScore)} (manual). Saved Gimme Gimme included.${ch.missing?.length?' Incomplete export: missing '+ch.missing.join(', ')+'. Estimates use defaults.':''}${ch.loot?.wraith?' Wraith Form stats used for multikill.':''}${ch.cove?' Using normal DR for these monster tables; Crystal Cove has its own override.':''}`;
 const words=query.toLowerCase().trim().split(/\s+/).filter(Boolean),rows=data.filter(d=>(monster==='all'||d.monster===monster)&&words.every(w=>(d.item+' '+d.monster).toLowerCase().includes(w)));
 page=Math.max(0,Math.min(page,Math.ceil(rows.length/30)-1));
 host.querySelector('#trueDrRows').innerHTML=rows.slice(page*30,page*30+30).map(d=>{
 const result=dropResult(d,dr,ch?.loot?{...ch.loot,orbScore}:null),quantity=result.quantity;
 return `<article class="true-dr-card"><header><img src="assets/${encodeURIComponent(d.icon)}_x1.png" alt="" width="28" height="28" loading="lazy"><div><h3>${esc(d.item)}</h3><p>${esc(d.monster)}</p></div></header><dl><div><dt>True odds</dt><dd>${result.chance===0?'Not eligible':result.chance==null?'Not modeled':odds(result.chance)}</dd></div><div><dt>Avg / drop</dt><dd class="true-dr-quantity">${quantity==null?'Unavailable':quantity===0?'—':'≈ '+fmt(quantity)}</dd></div></dl><footer>Base: ${odds(d.chance)}${d.routes.length>1?' · '+d.routes.length+' paths':d.nested?' · Rare table':''}${d.primary&&multikill(d,ch?.loot)!==null?`<span>Material multikill: ×${fmt(multikill(d,ch?.loot))}</span>`:''}${result.stack?.factor>1?`<span title="Pack ×${result.stack.pack}; ${fmt(result.stack.chance*100)}% chance of ×${result.stack.proc}">Stack bonuses: ×${fmt(result.stack.factor)}</span>`:''}${result.reason?`<span>${esc(result.reason)}</span>`:''}${d.quest?`<span>Quest: ${esc(d.quest)}</span>`:''}</footer></article>`;
 }).join('')||'<p class="true-dr-empty">No matching drops.</p>';
 host.querySelector('#trueDrCount').textContent=rows.length?`${page*30+1}–${Math.min(page*30+30,rows.length)} of ${fmt(rows.length)} drops`:'0 drops';
 host.querySelector('#trueDrPrev').disabled=page===0;host.querySelector('#trueDrNext').disabled=(page+1)*30>=rows.length;
 }
 host.querySelector('#trueDrOrb').oninput=e=>{orbScore=Math.max(0,Number(e.target.value)||0);paint();};
 host.querySelector('#trueDrCharacter').onchange=e=>{selected=e.target.value;paint();};
 host.querySelector('#trueDrMonster').onchange=e=>{monster=e.target.value;page=0;paint();};
 host.querySelector('#trueDrSearch').oninput=e=>{query=e.target.value;page=0;paint();};
 host.querySelector('#trueDrPrev').onclick=()=>{page--;paint();};host.querySelector('#trueDrNext').onclick=()=>{page++;paint();};paint();
 }catch(error){if(current()){host.innerHTML=`<section class="carry-empty"><h2>True DR unavailable</h2><p>${esc(error.message)}</p><button type="button">Retry</button></section>`;host.querySelector('button').onclick=()=>render(host,raw);}}
}
const api={render,rowsFrom,adjusted,odds,multikill,quantityPerDrop,dropResult};root.TrueDr=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
