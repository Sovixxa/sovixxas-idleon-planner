(function(root){

'use strict';

const stats=[['str','STR','Strength','#f3a179'],['wis','WIS','Wisdom','#b6a0ff'],['agi','AGI','Agility','#78dcb0'],['luk','LUK','Luck','#f4d378']];

const nodes={

 damage:{name:'Damage',note:'Your class determines which primary stat contributes to damage: STR for Warrior classes, AGI for Archer classes, WIS for Mage classes, and LUK for Beginner classes. Other bonuses also affect the final damage.',next:'combat',link:'helps defeat enemies'},

 accuracy:{name:'Accuracy',note:'Accuracy uses a different stat for each class: WIS for Warriors, STR for Archers, AGI for Mages, and LUK for Beginners. More accuracy helps until you reach the target monster’s hit requirement.',next:'combat',link:'helps attacks land'},

 efficiency:{name:'Skill efficiency',note:'Primary-stat connections: STR contributes to Mining efficiency, WIS to Chopping efficiency, and AGI to Catching efficiency. Expand to see the available efficiency bonuses.',next:'resources',link:'improves gathering potential'},

 drops:{name:'Drop rate',note:'LUK contributes to drop rate. The final chance also depends on the item, loot table and other bonuses; extra luck does not guarantee a particular drop.',next:'loot',link:'affects eligible drop chances'},

 combat:{name:'Combat',note:'Damage and accuracy meet here. Both can help combat, but actual results depend on the enemy, attack speed, other bonuses and any applicable caps.'},

 resources:{name:'Resources',note:'Skill efficiency contributes to gathering results and access to harder resource tiers. Actual gains also depend on the skill, speed, tools and other bonuses.'},

 loot:{name:'Item drops',note:'Drop rate affects eligible loot rolls. Individual items can have special rules and caps, so this connection is directional rather than a promise of a fixed gain.'}

};

const links={str:[['damage','Warrior classes'],['accuracy','Archer classes'],['efficiency','Mining']],wis:[['damage','Mage classes'],['accuracy','Warrior classes'],['efficiency','Chopping']],agi:[['damage','Archer classes'],['accuracy','Mage classes'],['efficiency','Catching']],luk:[['damage','Beginner classes'],['accuracy','Beginner classes'],['drops','contributes to']]};

let disposeDepth=null,mainCamera=null,dismissEvents=null,statWorker=null;

function dispose(){statWorker?.terminate();statWorker=null;dismissEvents?.abort();dismissEvents=null;document.body.classList.remove('game-map-screen');disposeDepth?.();disposeDepth=null;mainCamera?.dispose();mainCamera=null;}

function render(host,raw={}){

 dispose();

 document.body.classList.add('game-map-screen');window.scrollTo(0,0);

 const expanded=new Set(),opened=new Set(),sources=root.StatMapSources.catalog();let selected='',showActions=false,selectedSource=null,mapHeight=950,scope='account',report=null,effectReport=null,skill='all',focusArea='core',sourceFilter='all',sourceQuery='',mapWidth=1880;

 let areas=root.StatMapSources.areas();

 let overviewAreas=areas.filter(a=>!['benefit:damage'].includes(a.id));

 areas.forEach(a=>nodes[a.id]={name:a.name,note:'Explore bonuses whose descriptions affect '+a.name+'. Conditions remain attached to each source.'});

 const canDive=id=>/^(benefit|effect|system):/.test(id)||!!links[id]||['damage','accuracy','efficiency','drops'].includes(id);

 const branchSet=id=>links[id]?expanded:opened;

 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

 host.innerHTML=`<section class="stat-map"><div class="section-head compact"><div><p class="eyebrow">Explore Idleon · Prototype</p><h2>Game Connections</h2><p>Explore how Idleon connects. Start with the four basic stats, then follow their effects into other systems.</p></div></div><div class="stat-map-tools"><label class="map-scope">Explore <select data-map-area><option value="core">Full game</option>${areas.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></label><label class="map-scope">Source <select data-map-system><option value="all">All sources</option></select></label><input class="map-source-search" type="search" data-map-search aria-label="Find a bonus" placeholder="Find a bonus…"><label class="map-scope">View <select data-map-scope><option value="account">Account-wide</option></select></label><label class="map-scope">Skill <select data-map-skill><option value="all">All skills</option><option>Mining</option><option>Chopping</option><option>Fishing</option><option>Catching</option><option>Trapping</option><option>Worship</option><option>Cooking</option><option>Laboratory</option><option value="spelunk">Spelunking</option></select></label><button type="button" class="secondary" data-map-all>Expand all</button><button type="button" class="secondary" data-map-reset>Reset map</button><span>Click a bubble to expand its bonuses or open a deep dive.</span></div><div class="stat-map-scroll" tabindex="0" aria-label="Game connection map; drag to pan and use the mouse wheel to zoom"><div class="stat-map-canvas"><div class="stat-map-columns"><span style="position:absolute;left:70px">ALCHEMY BUBBLES</span><span style="position:absolute;left:315px">STAMPS</span><span style="position:absolute;left:560px">MEALS</span><span style="position:absolute;left:890px">STATS → EFFECTS → SYSTEMS</span></div><svg class="stat-map-lines" viewBox="0 0 1120 720" aria-hidden="true"></svg><div class="stat-map-nodes"></div></div></div><div class="stat-map-depth" hidden></div><aside class="stat-map-detail" aria-live="polite"></aside></section>`;

 const positions={};stats.forEach((s,i)=>positions[s[0]]=[930,140+i*220]);['damage','accuracy','efficiency','drops'].forEach((s,i)=>positions[s]=[1320,140+i*220]);Object.assign(positions,{combat:[1720,250],resources:[1720,580],loot:[1720,850]});

 function paint(focus){

  overviewAreas.forEach((a,i)=>positions[a.id]=[180+(i%8)*210,1060+Math.floor(i/8)*200]);

  const visible=new Set(focusArea==='core'?[...stats.map(s=>s[0]),'damage','accuracy','efficiency','drops',...overviewAreas.map(a=>a.id)]:[focusArea]),edges=[];

  if(focusArea!=='core')positions[focusArea]=[180,360];

  const shownSources=sources.filter(s=>s.targets.some(t=>visible.has(t)&&(expanded.has(t)||opened.has(t)))&&root.StatMapSources.relevantSkill(s,skill)&&(sourceFilter==='all'||s.type===sourceFilter)&&(!sourceQuery||`${s.name} ${s.description}`.toLowerCase().includes(sourceQuery)));

  const organized=root.StatMapSources.organized(shownSources),headings=[];
  const worlds=[...new Set(organized.map(s=>s.world))],startX=focusArea==='core'?2000:470;
  let worldY=60,right=startX+600;
  for(const world of worlds){
   const entries=organized.filter(s=>s.world===world),types=[...new Set(entries.map(s=>s.source.type))];
   headings.push(`<span data-map-world="${esc(world)}" style="position:absolute;left:${startX-65}px;top:${worldY-20}px;font-size:18px;font-weight:700">${esc(world)}</span>`);
   let rowY=worldY+130,rowHeight=0;
   types.forEach((type,ti)=>{
    if(ti&&ti%4===0){rowY+=rowHeight+100;rowHeight=0;}
    const items=entries.filter(s=>s.source.type===type),tiers=[...new Set(items.map(s=>s.tier))],x=startX+(ti%4)*650;
    const columns=Math.min(3,Math.max(...tiers.map(t=>Math.ceil(items.filter(s=>s.tier===t).length/10))));
    headings.push(`<span data-map-column="${esc(type)}" style="position:absolute;left:${x-75}px;top:${rowY-110}px;width:${150+(columns-1)*180}px;text-align:center">${esc(items[0].system)}</span>`);
    let y=rowY;
    for(const tier of tiers){
     const members=items.filter(s=>s.tier===tier);
     if(tier){headings.push(`<span data-map-tier="${esc(tier)}" style="position:absolute;left:${x-75}px;top:${y-75}px;width:${150+(columns-1)*180}px;text-align:center;opacity:.8">${esc(tier)}</span>`);y+=20;}
     members.forEach(({source:s},i)=>{positions[s.id]=[x+(i%columns)*180,y+Math.floor(i/columns)*155];});
     y+=Math.ceil(members.length/columns)*155+35;
    }
    rowHeight=Math.max(rowHeight,y-rowY);right=Math.max(right,x+(columns-1)*180+100);
   });
   worldY=rowY+rowHeight+110;
  }
  mapHeight=Math.max(focusArea==='core'?1160+Math.floor((overviewAreas.length-1)/8)*200:950,worldY);mapWidth=Math.max(1000,right);
  const canvas=host.querySelector('.stat-map-canvas');canvas.style.width=mapWidth+'px';canvas.style.height=mapHeight+'px';
  host.querySelector('.stat-map-lines').setAttribute('viewBox',`0 0 ${mapWidth} ${mapHeight}`);
  host.querySelector('.stat-map-columns').innerHTML=headings.join('');
  shownSources.forEach(s=>s.targets.filter(t=>visible.has(t)&&(expanded.has(t)||opened.has(t))).forEach(t=>edges.push({from:s.id,to:t,label:'',color:s.type==='Bubble'?'#91c8ff':s.type==='Stamp'?'#f4d378':'#9cdea4',lane:0})));

  stats.forEach(([id,,,color],index)=>{if(!expanded.has(id)||!visible.has(id))return;links[id].forEach(([to,label])=>{visible.add(to);edges.push({from:id,to,label,color,lane:index});});});

  [...visible].forEach(id=>{if(opened.has(id)&&nodes[id]?.next){visible.add(nodes[id].next);edges.push({from:id,to:nodes[id].next,label:nodes[id].link,color:'#b9cad9',lane:0});}});

  host.querySelector('.stat-map-lines').innerHTML=edges.map(({from,to,label,color,lane})=>{const [x,y]=positions[from],[tx,ty]=positions[to],direction=tx>=x?1:-1,start=x+direction*65,end=tx-direction*68;const labelX=start+direction*(40+lane*47),labelY=y+(ty-y)*.13-9;return `<g><path d="M${start} ${y} C${start+direction*155} ${y},${end-direction*155} ${ty},${end} ${ty}" stroke="${color}"/><path d="M${end-direction*7} ${ty-4}l${direction*7} 4 ${-direction*7} 4" stroke="${color}"/><text x="${labelX}" y="${labelY}" fill="${color}">${label}</text></g>`;}).join('');

  host.querySelector('.stat-map-nodes').innerHTML=[...visible].map(id=>{const stat=stats.find(s=>s[0]===id),n=nodes[id],branch=canDive(id)||!!n?.next,on=stat?expanded.has(id):opened.has(id),[x,y]=positions[id];return `<button type="button" class="stat-map-node ${stat?'is-stat':''} ${selected===id?'is-selected':''}" style="left:${x}px;top:${y}px;--node-color:${stat?stat[3]:'#b9cad9'}" data-map-node="${id}" ${branch?`aria-expanded="${on}"`:''}><strong>${stat?stat[1]:n.name}</strong><small>${stat?stat[2]:branch?'Explore effect':'View details'}</small>${stat?`<b class="map-stat-value" title="${scope==='account'?'Shared account baseline; excludes personal and conditional bonuses':'Saved character total'}">${(()=>{const value=scope==='account'?report?.account?.[id]?.computed:report?.characters?.[Number(scope)]?.stats?.[id]?.saved;return Number.isFinite(value)?value.toLocaleString(undefined,{maximumFractionDigits:0}):'—';})()}</b>`:''}${!stat&&canDive(id)&&effectReport?`<b class="map-stat-value">${esc(root.EffectSourceMap.view(effectReport,id,scope,'allEff').label)}</b>`:''}${branch?`<span aria-hidden="true">${on?'−':'+'}</span>`:''}</button>`;}).join('');

  host.querySelector('.stat-map-nodes').insertAdjacentHTML('beforeend',shownSources.map(s=>{const [x,y]=positions[s.id];return `<button type="button" class="stat-map-node stat-source-node" style="left:${x}px;top:${y}px;--node-color:${s.type==='Bubble'?'#91c8ff':s.type==='Stamp'?'#f4d378':'#9cdea4'}" data-map-source="${s.id}" data-map-source-type="${esc(s.type)}"><img src="${esc(s.icon)}" alt=""><strong>${esc(s.name)}</strong><small>${esc(s.type)} · ${esc(s.value||s.label)}</small></button>`;}).join(''));

  if(canDive(selected)&&showActions)host.querySelector('.stat-map-nodes').insertAdjacentHTML('beforeend',`<div class="stat-map-node-actions" role="group" aria-label="${stats.find(s=>s[0]===selected)?.[2]||nodes[selected].name} options" style="left:${positions[selected][0]+85}px;top:${positions[selected][1]-47}px"><button type="button" class="secondary" data-str-expand aria-expanded="${branchSet(selected).has(selected)}">${branchSet(selected).has(selected)?'Collapse':'Expand'}</button><button type="button" class="secondary" data-str-deep>Deep dive →</button></div>`);

  host.querySelector('[data-str-expand]')?.addEventListener('click',()=>{branchSet(selected).has(selected)?branchSet(selected).delete(selected):branchSet(selected).add(selected);paint();host.querySelector('[data-str-expand]')?.focus({preventScroll:true});});

  host.querySelector('[data-str-deep]')?.addEventListener('click',openStrength);

  const stat=stats.find(s=>s[0]===selected),detail=host.querySelector('.stat-map-detail');

  detail.innerHTML=selected?`<h3>${stat?stat[2]:nodes[selected].name}</h3><p>${stat?links[selected].map(([to,label])=>`${nodes[to].name}: ${label}`).join(' · ')+'. Select an effect bubble to follow the next connection.':nodes[selected].note}</p>`:(focusArea==='core'?'<h3>Where would you like to start?</h3><p>Select STR, WIS, AGI or LUK. Open more than one stat to see their shared connections.</p>':`<h3>${esc(nodes[focusArea].name)}</h3><p>Select a named bonus to inspect its effect and conditions.</p>`);

  if(selectedSource){const source=sources.find(s=>s.id===selectedSource);detail.innerHTML=`<h3>${esc(source.name)} · ${esc(source.type)}</h3><p>${esc(source.description.replaceAll('{','[level bonus]').replaceAll('}','[level bonus]'))}</p>`;}

  if(focus)host.querySelector(`[data-map-node="${focus}"]`)?.focus({preventScroll:true});

 }

 function openStrength(){

  const statKey=selected;

  showActions=false;host.querySelector('.stat-map-node-actions')?.remove();

  const depth=host.querySelector('.stat-map-depth');

  host.querySelector('.stat-map-scroll').hidden=true;host.querySelector('.stat-map-detail').hidden=true;host.querySelector('.stat-map-tools').hidden=true;depth.hidden=false;

  disposeDepth=(links[statKey]?root.StrengthSources:root.EffectSourceMap).render(depth,raw,()=>{disposeDepth?.();disposeDepth=null;depth.hidden=true;depth.innerHTML='';host.querySelector('.stat-map-scroll').hidden=false;host.querySelector('.stat-map-detail').hidden=false;host.querySelector('.stat-map-tools').hidden=false;selected=statKey;branchSet(selected).add(selected);paint(statKey);},statKey,scope,value=>{scope=value;host.querySelector('[data-map-scope]').value=value;});

  depth.querySelector('[data-strength-back],[data-effect-back]').focus({preventScroll:true});

 }

 host.querySelector('.stat-map-nodes').onclick=e=>{const sourceButton=e.target.closest('[data-map-source]');if(sourceButton){selectedSource=sourceButton.dataset.mapSource;showActions=false;paint();host.querySelector(`[data-map-source="${selectedSource}"]`)?.focus({preventScroll:true});return;}const b=e.target.closest('[data-map-node]');if(!b)return;selectedSource=null;selected=b.dataset.mapNode;showActions=canDive(selected);const set=links[selected]?expanded:opened;set.has(selected)?set.delete(selected):set.add(selected);paint(selected);};

 dismissEvents=new AbortController();

 document.addEventListener('pointerdown',e=>{

  if(!showActions||e.target.closest('.stat-map-node-actions,[data-map-node]'))return;

  showActions=false;host.querySelector('.stat-map-node-actions')?.remove();

 },{capture:true,signal:dismissEvents.signal});

 document.addEventListener('keydown',e=>{

  if(e.key!=='Escape'||!showActions)return;

  showActions=false;host.querySelector('.stat-map-node-actions')?.remove();

  host.querySelector(`[data-map-node="${selected}"]`)?.focus({preventScroll:true});

 },{signal:dismissEvents.signal});

 host.querySelector('[data-map-all]').onclick=()=>{if(focusArea!=='core'){opened.add(focusArea);paint();return;}stats.forEach(s=>expanded.add(s[0]));Object.keys(nodes).filter(id=>nodes[id].next||canDive(id)).forEach(id=>opened.add(id));paint();};

 host.querySelector('[data-map-reset]').onclick=()=>{expanded.clear();opened.clear();selected='';selectedSource=null;showActions=false;paint();};

 paint();

 mainCamera=root.MapViewport.attach(host.querySelector('.stat-map-scroll'),host.querySelector('.stat-map-canvas'),{width:()=>mapWidth,height:()=>mapHeight});

 const mapShell=host.querySelector('.stat-map');

 function refreshSystems(){const picker=host.querySelector('[data-map-system]');picker.innerHTML='<option value="all">All sources</option>'+[...new Set(sources.map(s=>s.type))].sort().map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');picker.value=sourceFilter;}

 refreshSystems();

 host.querySelector('[data-map-area]').onchange=e=>{focusArea=e.target.value;selected='';selectedSource=null;showActions=false;if(focusArea!=='core')opened.add(focusArea);paint();};

 host.querySelector('[data-map-system]').onchange=e=>{sourceFilter=e.target.value;paint();};

 host.querySelector('[data-map-search]').oninput=e=>{sourceQuery=e.target.value.trim().toLowerCase();paint();};

 host.querySelector('[data-map-skill]').onchange=e=>{skill=e.target.value;paint();};

 host.querySelector('[data-map-scope]').onchange=e=>{scope=e.target.value;paint();};

 if(raw&&Object.keys(raw).length){statWorker=new Worker('strength-sources-worker.js');const worker=statWorker;worker.onmessage=e=>{worker.terminate();if(statWorker!==worker)return;statWorker=null;if(e.data.error)return;report=e.data;const picker=host.querySelector('[data-map-scope]');picker.innerHTML='<option value="account">Account-wide</option>'+(report.characters||[]).map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join('');picker.value=scope;paint();};worker.onerror=()=>{worker.terminate();if(statWorker===worker)statWorker=null;};worker.postMessage(raw);root.EffectSourceMap.load(raw).then(result=>{if(!host.contains(mapShell))return;effectReport=result;sources.splice(0,sources.length,...result.mapSources.map(s=>({...s})));areas=root.StatMapSources.areas();overviewAreas=areas.filter(a=>a.id!=='benefit:damage');areas.forEach(a=>nodes[a.id]={name:a.name,note:a.name});host.querySelector('[data-map-area]').innerHTML='<option value="core">Full game</option>'+areas.map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('');host.querySelector('[data-map-area]').value=focusArea;refreshSystems();paint();}).catch(()=>{});}



}

root.StatConnections={render,dispose};

})(window);
