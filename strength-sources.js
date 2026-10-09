(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const talentNames=root.PrimarySourceCatalog.talentNames;
const normalize=name=>name.replace(/Talent (\d+)/g,(s,id)=>talentNames[id]||s).toLowerCase();
const groupDefinitions=[
 {id:'base',name:'Flat bonuses',label:'+ STR / All Stats',stages:['Base additions','Shared all-stat base'],note:'Flat bonuses enter the base before stat percentages. Myriad Crate, cooking and guild share one rounded pool; their subtotal is not another bonus.'},
 {id:'gear',name:'Equipment',label:'Base + amplification',stages:['Equipment base','Equipment amplification %'],note:'Equipment, Gallery and Hat Rack form the equipment base. Equipment amplification boosts this base only.'},
 {id:'obols',name:'Obols',label:'Base + amplification',stages:['Obol base','Obol amplification %'],note:'Personal and family obol base STR is boosted by obol amplification. Other flat and percentage obol effects appear in their respective branches.'},
 {id:'percent',name:'Stat percentages',label:'+ % STR / All Stats',stages:['Additive stat %'],note:'These percentages join the All Stats percentage pool to scale the combined base. They are not independent multipliers.'},
 {id:'all',name:'All Stats %',label:'Also increases STR',stages:['All-stat % pool'],note:'These bonuses increase all four primary stats. Their pool is rounded down to one decimal before joining the other stat percentages.'},
 {id:'final',name:'Final additions',label:'+ STR after scaling',stages:['Post-multiplier additions'],note:'These bonuses are added after the base is multiplied. The final Strength total is then rounded down.'}
];
const catalog=root.PrimarySourceCatalog.catalog.str;
const notes={
 'alchemy · slabi strength':'The bubble bonus scales with each full 100 items recorded in the Slab.',
 'alchemy · tome strength':'Scales with each full 2,000 Tome points above 5,000. Grey Tome Book and the Troll armor set can amplify this bonus.',
 'shimmer island × shim lantern':'Shimmer Island STR is amplified by the Shim Lantern artifact, with the modeled multiplier limited to 1×–4×.',
 'active buff · firmly grasp it':'Requires the Firmly Grasp It buff to be active in the exported setup.',
 'companion · king doot × cosmo':'Requires the King Doot companion bonus and at least level 2 Divinity on this character; scales with the relevant Cosmo bonus.',
 'golden food · golden grilled cheese nomwich':'Depends on the equipped stack and golden-food effect, and includes the matching Beanstalk bonus when unlocked.',
 'star signs · str %':'Includes both STR percentage and All Stat percentage star signs used by this calculation.',
 'family · str':'Uses the Warrior family STR bonus; the family bonus talent can affect the provider.',
 'family · all stat':'Uses the Bubonic Conjuror family All Stat bonus.',
 'will of the eldest':'Limited by both the talent and the highest character level divided by ten, rounded down.',
 'gaming · obol stat booster':'Adds 40% obol amplification when the relevant Superbit is unlocked.',
 'account talent · eternal str':'Uses the highest modeled base-level Eternal STR account talent bonus across characters.'
};
const fmt=n=>Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:3}):'Unavailable';
function sourceRows(primary,statKey='str'){
 // Saved source nodes come directly from the same ledger shown by All Account
 // Bonuses. Do not supplement it with a separate list of assumed contributions.
 if(primary)return primary.rows.filter(r=>r.name!=='Shared all-stat pool (rounded)').map(r=>({...r,name:r.name.replace(/Talent (\d+)/g,(s,id)=>talentNames[id]||s)}));
 return root.PrimarySourceCatalog.catalog[statKey].map(row=>({...row}));
}

function render(host,raw,onBack,statKey='str',initialScope='account',onScopeChange=()=>{}){
 const statName={str:'Strength',wis:'Wisdom',agi:'Agility',luk:'Luck'}[statKey],statCode=statKey.toUpperCase();
 const groups=groupDefinitions.map(g=>({...g,label:g.label.replaceAll('STR',statCode),note:g.note.replaceAll('STR',statCode).replaceAll('Strength',statName)}));

 let selected='',query='',character=initialScope,account={},characters=[],loading=false,error='',worker=null,timer=null,disposed=false,camera=null,selectedSource=null;
 host.innerHTML=`<section class="strength-depth"><div class="strength-depth-head"><button class="secondary" type="button" data-strength-back>← Full game map</button><p>${statCode} ← bonus types ← bonus sources</p></div><p>Click a bonus-type bubble to reveal its sources. Click a source for its effect. Drag the map with the hand cursor. Use the mouse wheel or + / − to zoom.</p><div class="strength-map-controls"><label>View<select data-strength-character><option value="account">Account-wide</option></select></label><label>Find a source<input type="search" data-strength-search placeholder="Alchemy, stamps…"></label><button type="button" class="secondary" data-strength-collapse>Collapse sources</button></div><div class="strength-account" role="status"></div><div class="strength-bubble-viewport" tabindex="0" aria-label="${statName} source bubble map; drag to pan, mouse wheel to zoom, or use arrow keys and plus or minus"><div class="strength-bubble-space"><div class="strength-bubble-canvas"><svg aria-hidden="true"></svg><div class="strength-bubble-nodes"></div></div></div></div><div class="strength-bubble-description" aria-live="polite">Select a branch to explore what gives ${statName}.</div><p class="stat-map-foot">${statName} source values come from the same ledger as All Account Bonuses, including grouped equipment, cards and vials. Individual items and deeper dependencies will expand this map further. Values are inputs to their named bonus type, not separate gains to final ${statCode}.</p></section>`;
 const shell=host.firstElementChild,live=()=>!disposed&&host.contains(shell);

 function paint(){
  if(!live())return;
  const p=character==='account'?account[statKey]:characters[Number(character)]?.stats[statKey],all=sourceRows(p,statKey),search=query.trim().toLowerCase();
  const rows=all.filter(r=>search?`${r.name} ${r.stage}`.toLowerCase().includes(search):groups.find(g=>g.id===selected)?.stages.includes(r.stage));
  const height=Math.max(850,Math.ceil(rows.length/3)*170+100),center=425;
  const canvas=shell.querySelector('.strength-bubble-canvas');canvas.dataset.height=height;canvas.style.height=height+'px';
  const vertices=[{id:statKey,x:115,y:center,name:statCode,sub:p?fmt(p.accountWide?p.computed:p.saved):statName,kind:'root'}];
  groups.forEach((g,i)=>vertices.push({id:g.id,x:420,y:90+i*134,name:g.name,sub:g.label,kind:'group',active:selected===g.id&&!search}));
  rows.forEach((r,i)=>vertices.push({id:'source-'+i,x:760+(i%3)*240,y:100+Math.floor(i/3)*170,name:r.name,sub:Number.isFinite(r.value)?(r.value>0?'+':'')+fmt(r.value)+(r.stage.includes('%')?'%':' '+statCode):'View effect',kind:'source',row:r,index:i}));
  const edges=groups.map(g=>({from:vertices.find(v=>v.id===g.id),to:vertices[0],active:selected===g.id&&!search}));
  vertices.filter(v=>v.kind==='source').forEach(v=>edges.push({from:v,to:vertices.find(n=>n.id===groups.find(g=>g.stages.includes(v.row.stage))?.id),active:true}));
  const svg=canvas.querySelector('svg');svg.setAttribute('viewBox',`0 0 1400 ${height}`);svg.innerHTML=edges.filter(e=>e.to).map(({from:a,to:b,active})=>{const sx=a.x-70,ex=b.x+70;return `<g class="${active?'active':''}"><path d="M${sx} ${a.y} C${sx-100} ${a.y},${ex+100} ${b.y},${ex} ${b.y}"/><path d="M${ex+7} ${b.y-4}l-7 4 7 4"/></g>`;}).join('');
  canvas.querySelector('.strength-bubble-nodes').innerHTML=vertices.map(v=>`<button type="button" class="strength-map-bubble ${v.kind} ${v.active?'active':''}" style="left:${v.x}px;top:${v.y}px" ${v.kind==='group'?`data-strength-group="${v.id}" aria-expanded="${v.active}"`:v.kind==='source'?`data-strength-source="${v.index}"`:'data-strength-effects'}>${v.kind==='source'&&root.PrimarySourceIcons[statKey+'|'+normalize(v.name)]?`<img class="deep-source-icon" src="${esc(root.PrimarySourceIcons[statKey+'|'+normalize(v.name)])}" alt="" width="32" height="32">`:''}<strong>${esc(v.name)}</strong><small>${esc(v.sub)}</small>${v.kind==='group'?`<span aria-hidden="true">${v.active?'−':'+'}</span>`:''}</button>`).join('');
  canvas.querySelectorAll('[data-strength-group]').forEach(b=>b.onclick=()=>{selected=selected===b.dataset.strengthGroup?'':b.dataset.strengthGroup;query='';selectedSource=null;shell.querySelector('[data-strength-search]').value='';paint();shell.querySelector(`[data-strength-group="${b.dataset.strengthGroup}"]`)?.focus({preventScroll:true});});
  canvas.querySelectorAll('[data-strength-source]').forEach(b=>b.onclick=()=>{selectedSource=rows[Number(b.dataset.strengthSource)];describe();canvas.querySelectorAll('[data-strength-source]').forEach(n=>n.classList.toggle('active',n===b));});
  canvas.querySelector('[data-strength-effects]').onclick=()=>{dispose();onBack();};
  shell.querySelector('.strength-account').innerHTML=p?.accountWide?`Shared ${statCode}: <strong title="Shared base × shared percentage multiplier + shared final additions; excludes personal and conditional bonuses.">${fmt(p.computed)}</strong>`:p?`Saved ${statCode}: <strong>${fmt(p.saved)}</strong> · Reconstructed: <strong>${fmt(p.computed)}</strong>${p.difference!==0?` · Unreconciled difference: ${fmt(p.difference)}`:''}`:loading?'Loading saved contributions…':error?`Saved values unavailable: ${esc(error)} <button type="button" class="secondary" data-strength-retry>Retry</button>`:'Reference map · Load a save on Home to show character contributions.';
  shell.querySelector('[data-strength-retry]')?.addEventListener('click',load);
  describe();camera?.refresh();
 }
 function describe(){const r=selectedSource,g=groups.find(g=>g.id===selected);shell.querySelector('.strength-bubble-description').innerHTML=r?`<strong>${esc(r.name)}</strong> · ${esc(r.stage)}<p>${esc(notes[normalize(r.name)]?.replaceAll('STR',statCode).replaceAll('Strength',statName)||groups.find(g=>g.stages.includes(r.stage))?.note||'Contribution from this source.')}</p>${r.detail?`<p>${esc(r.detail)}</p>`:''}${r.value===0?'<p>No contribution in this setup; it may be inactive, unequipped, class-specific or not unlocked.</p>':''}`:g?`<strong>${esc(g.name)}</strong><p>${esc(g.note)}</p>`:`Click a bonus-type bubble to reveal the sources connected to ${statName}. Arrows point toward the stat they feed.`;}
 function load(){
  if(!raw||!Object.keys(raw).length)return;
  loading=true;error='';paint();
  try{worker=new Worker('strength-sources-worker.js');
   const finish=(message)=>{clearTimeout(timer);worker?.terminate();worker=null;if(!live())return;loading=false;error=message.error||'';characters=message.characters||[];account=message.account||{};if(!error&&!characters.length)error='No character data found in this export.';const picker=shell.querySelector('[data-strength-character]');picker.innerHTML='<option value="account">Account-wide</option>'+characters.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join('');picker.value=String(character);paint();};
   timer=setTimeout(()=>finish({error:'The calculation timed out.'}),90000);worker.onmessage=e=>finish(e.data);worker.onerror=e=>finish({error:e.message||'Could not load the calculation worker.'});worker.postMessage(raw);
  }catch(e){clearTimeout(timer);worker?.terminate();worker=null;loading=false;error=e.message;paint();}
 }
 shell.querySelector('[data-strength-search]').oninput=e=>{query=e.target.value;selectedSource=null;paint();};
 shell.querySelector('[data-strength-character]').onchange=e=>{character=e.target.value;onScopeChange(character);selectedSource=null;paint();};
 shell.querySelector('[data-strength-collapse]').onclick=()=>{selected='';query='';selectedSource=null;shell.querySelector('[data-strength-search]').value='';paint();};
 const dispose=()=>{disposed=true;camera?.dispose();clearTimeout(timer);worker?.terminate();worker=null;};
 shell.querySelector('[data-strength-back]').onclick=()=>{dispose();onBack();};
 paint();camera=root.MapViewport.attach(shell.querySelector('.strength-bubble-viewport'),shell.querySelector('.strength-bubble-canvas'),{width:1400,height:()=>Number(shell.querySelector('.strength-bubble-canvas').dataset.height)});load();return dispose;
}
root.StrengthSources={render,sourceRows,catalog,groups:groupDefinitions};
})(window);
