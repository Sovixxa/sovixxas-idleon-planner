(function(root){
  'use strict';
  const savedJsonKey='idleon-json-compare-last-v1';
  let draft='',restored=false;
  try{const saved=root.localStorage?.getItem(savedJsonKey);if(saved){const value=JSON.parse(saved);if(value&&typeof value==='object'&&!Array.isArray(value)){draft=saved;restored=true;}}}catch{}

  function compare(before,after){
    const rows=[],stack=[{before,after,path:'$'}];
    while(stack.length){
      const item=stack.pop(),a=item.before,b=item.after;
      if(a===b)continue;
      if(a!==null&&b!==null&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)){
        const keys=[...new Set([...Object.keys(a),...Object.keys(b)])];
        for(let i=keys.length-1;i>=0;i--){const key=keys[i],path=item.path+(Array.isArray(a)?`[${key}]`:`[${JSON.stringify(key)}]`);
          const hasA=Object.hasOwn(a,key),hasB=Object.hasOwn(b,key);
          if(!hasA||!hasB)rows.push({path,type:hasA?'Removed':'Added',before:hasA?a[key]:undefined,after:hasB?b[key]:undefined});
          else stack.push({path,before:a[key],after:b[key]});
        }
      }else rows.push({...item,type:'Changed'});
    }
    return rows.map((r,i)=>({...r,id:r.id??((r.group||'')+':'+r.name+':'+i)}));
  }
  const categories=[{id:'vials',name:'Alchemy · Vials',world:2},{id:'sigils',name:'Alchemy · Sigils',world:2},{id:'tome',name:'Tome',world:4},{id:'shinyPets',name:'Shiny Pets',world:4},{id:'slab',name:'Slab',world:5},{id:'slabGreenStacks',name:'Greenstacks',world:5},{id:'upgradeVault',name:'Upgrade Vault',world:1}];
  const categoryIcons={vials:'nav-Alchemy.png',sigils:'nav-Alchemy.png',tome:'TomeClaim.png',shinyPets:'PetEgg.png',slab:'Slab5.png',slabGreenStacks:'Slab5.png',upgradeVault:'nav-UpgradeVault.png'};
  const additions=[["stamps","Stamps",1,"StampA1.png"],["statues","Statues",1,"EquipmentStatues1.png"],["anvil","Anvil",1,"SmithingHammerChisel.png"],["bubbles","Alchemy · Bubbles",2,"nav-Alchemy.png"],["obols","Obols",2,"ObolGold0.png"],["postOffice","Post Office",2,"UIboxUpg0.png"],["construction","Construction",3,"nav-Construction.png"],["refinery","Refinery",3,"nav-SaltLick.png"],["printer","Printer Samples",3,"nav-Construction.png"],["worship","Worship Waves",3,"nav-Worship.png"],["meals","Meals",4,"nav-Cooking.png"],["kitchens","Kitchens",4,"nav-Cooking.png"],["lab","Lab Chips & Jewels",4,"nav-Lab.png"],["artifacts","Artifacts",5,"nav-Sailing.png"],["boats","Boats",5,"nav-Sailing.png"],["divinity","Divinity",5,"nav-Divinity.png"],["gaming","Gaming",5,"nav-Gaming.png"],["crops","Farming Crops",6,"nav-Farming.png"],["landRanks","Land Ranks",6,"nav-Farming.png"],["sneaking","Sneaking",6,"nav-Sneaking.png"],["summoning","Summoning Wins",6,"nav-Summoning.png"],["research","Research",7,"nav-Research.png"],["spelunking","Spelunking",7,"nav-Spelunking.png"],["gallery","Gallery",7,"nav-Nametags.png"]];
  additions.push(['saltLick','Salt Lick',3,'nav-SaltLick.png'],['atomCollider','Atom Collider',3,'nav-AtomCollider.png'],['shrines','Shrines',3,'nav-Construction.png'],['deathNote','Death Note',3,'nav-DeathNote.png'],['emperor','Emperor Bonuses',6,'nav-EmperorBonuses.png'],['observations','Observations & Insight',7,'nav-Research.png']);
  for(const [id,name,world,icon] of additions){categories.push({id:"cmp_"+id,name,world});categoryIcons["cmp_"+id]=icon;}
  const moreCategories=[
    ['forgeBonuses','Forge',1,'SmithingHammerChisel.png'],['cmp_capacity','Carry Capacity',1,'InvBag1.png'],['cmp_bags','Bags',1,'InvBag2.png'],['starSigns','Star Signs',1,'nav-StarSigns.png'],['bribes','Bribes',1,'nav-Bribes.svg'],['dungeons','Dungeons',1,'nav-Dungeons.png'],
    ['cmp_arcade','Arcade',2,'GemP1.png'],['killroy','Killroy',2,'nav-Killroy.png'],['islandExpeditions','Island Expeditions',2,'nav-Sailing.png'],
    ['prayers','Prayers',3,'nav-Prayers.png'],['cmp_trapping','Trapping',3,'Critter1.png'],['cmp_equinox','Equinox',3,'nav-StarSigns.png'],
    ['cmp_breeding','Breeding',4,'nav-Breeding.png'],['petArena','Pet Arena',4,'PetEgg.png'],['riftRewards','Rift',4,'nav-Tome.png'],
    ['cmp_hole','The Hole',5,'nav-Hole.png'],
    ['cmp_minehead','Minehead',7,'MineH0.png'],['cmp_jelly','Jelly Operator',7,'JellyOp0.png'],['clamworks','Clamworks',7,'nav-Clamworks.png'],['coralReef','Coral Reef',7,'nav-CoralReef.png'],['coralKid','Coral Kid',7,'nav-Divinity.png'],['bigFish','Big Fish',7,'nav-CoralReef.png'],['meritocracy','Meritocracy',7,'nav-Meritocracy.png'],['zenithMarket','Zenith Market',7,'nav-ZenithMarket.png']
  ];
  for(const [id,name,world,icon] of moreCategories){categories.push({id,name,world});categoryIcons[id]=icon;}
  const holeSections={holeSchematics:'Engineer',holeMajik:'Majik',holeStudies:'Studies',holeMeasurements:'Measurements',holeFloors:'Cavern Floors',holeResources:'Resource Caverns',holeBravery:'Bravery',holeJustice:'Justice',holeWisdom:'Wisdom',holeSanctum:'Sanctum',holeBell:'Bell',holeWell:'Well',holeFountain:'Fountain',holeHarp:'Harp',holeLamp:'Lamp',holeDawgDen:'Dawg Den',holeJars:'Jars',holeGambit:'Gambit'};
  const worldIcons=['StampA1.png','nav-Alchemy.png','nav-Construction.png','nav-Breeding.png','nav-Sailing.png','nav-Farming.png','nav-Spelunking.png'];
  function withIcon(element,label,source,fallback='assets/TomeClaim.png'){
    element.replaceChildren();const identity=document.createElement('span');identity.className='json-identity';
    const frame=document.createElement('span');frame.className='json-icon';const img=document.createElement('img');img.src=source;img.alt='';img.width=28;img.height=28;img.loading='lazy';img.onerror=()=>{img.onerror=null;img.src=fallback;};frame.append(img);
    const nametag=source?.match(/NametagLeft_(\d+)\.png$/);
    if(nametag){frame.classList.add('json-nametag-icon');frame.replaceChildren();for(const part of ['Left','Middle','Right']){const piece=document.createElement('img');piece.src='assets/Nametag'+part+'_'+nametag[1]+'.png';piece.alt='';piece.className='json-nametag-'+part.toLowerCase();frame.append(piece);}const letters=document.createElement('span');letters.textContent='Aa';letters.setAttribute('aria-hidden','true');frame.append(letters);}
    const text=document.createElement('span');text.textContent=label;identity.append(frame,text);element.append(identity);
  }
  function comparisonRows(groups,key){
    if(key==='cmp_hole')return Object.entries(holeSections).flatMap(([id,section])=>(groups[id]||[]).map((r,i)=>({...r,id:id+':'+i,section})));
    const rows=groups[key]||[];
    if(key==='shinyPets')return rows.flatMap(bonus=>(bonus.pets||[]).map(p=>({id:String(bonus.bonusId)+':'+p.id,name:String(root.WORLD4_CATALOG?.MonsterNames?.[p.id]||p.id).replace(/_/g,' ')+' · '+bonus.name,icon:'assets/pets-static/'+p.id+'.png',level:p.level==null?'Unavailable':'Level '+p.level,effect:bonus.effect,status:p.unlocked==null?'unknown':p.unlocked?'active':'missing'})));
    return rows;
  }
  function pairsFor(first,second,key){const left=comparisonRows(first,key),right=comparisonRows(second,key),id=r=>String(r.id??r.name),a=new Map(left.map(r=>[id(r),r])),b=new Map(right.map(r=>[id(r),r]));return {left,right,pairs:[...new Set([...a.keys(),...b.keys()])].map(id=>({a:a.get(id),b:b.get(id)}))};}
  function isChanged({a,b}){return !a||!b||a.value!==b.value||a.score!==b.score||a.level!==b.level||a.status!==b.status||a.effect!==b.effect||a.icon!==b.icon;}
  function renderOverview(host,first,second,select){
    const title=document.createElement('h3');title.textContent='Changes by world';host.append(title);
    const note=document.createElement('p');note.textContent='Open a category to inspect the individual changes. Unavailable categories are shown separately from unchanged ones.';host.append(note);
    const grid=document.createElement('div');grid.className='json-overview';host.append(grid);
    for(let world=1;world<=7;world++){const section=document.createElement('section'),heading=document.createElement('h4');withIcon(heading,'World '+world,'assets/'+worldIcons[world-1]);section.append(heading);
      for(const category of categories.filter(c=>c.world===world)){const {left,right,pairs}=pairsFor(first,second,category.id),count=pairs.filter(isChanged).length,button=document.createElement('button');button.type='button';withIcon(button,category.name,'assets/'+categoryIcons[category.id]);const badge=document.createElement('span');badge.className='json-overview-count';badge.textContent=!left.length||!right.length?'Unavailable':count?count+' changed':'No changes';button.append(badge);button.onclick=()=>select(category);section.append(button);}grid.append(section);
    }
  }
  function renderComparison(host,first,second,category){
    const left=comparisonRows(first,category.id),right=comparisonRows(second,category.id);
    const title=document.createElement('h3');withIcon(title,category.name,'assets/'+categoryIcons[category.id]);host.append(title);
    if(!left.length||!right.length){const empty=document.createElement('p');empty.textContent='This comparison is unavailable in one or both saves.';host.append(empty);return;}
    const key=r=>String(r.id??r.name),a=new Map(left.map(r=>[key(r),r])),b=new Map(right.map(r=>[key(r),r]));
    const collection=['slab','slabGreenStacks'].includes(category.id);
    if(category.showAll){const hint=document.createElement('p');hint.textContent='Showing every entry, including unchanged progress. Turn off Show unchanged to see gains only.';host.append(hint);}
    const text=r=>!r?'Unavailable':r.level||'Unavailable';
    const pairs=[...new Set([...a.keys(),...b.keys()])].map(id=>({a:a.get(id),b:b.get(id)}));
    const changed=isChanged,unavailable=p=>!p.a||!p.b||p.a.status==='unknown'||p.b.status==='unknown';
    const note=document.createElement('p');note.textContent=pairs.filter(changed).length+' changed entries · Loaded account → pasted JSON';host.append(note);
    if(collection){const summary=document.createElement('p');summary.textContent=(category.id==='slab'?'Items found: ':'Greenstacks: ')+left.filter(r=>r.status==='maxed').length+' → '+right.filter(r=>r.status==='maxed').length;host.append(summary);}
    const controls=document.createElement('div');controls.className='json-tome-controls';controls.innerHTML='<input type="search" aria-label="Search comparison" placeholder="Find an entry…"><label><input type="checkbox"> Show unchanged</label><label>Sort <select aria-label="Sort comparison"><option value="name">Name</option><option value="change">Changed first</option><option value="delta">Numeric change</option><option value="value">Pasted value</option></select></label><button type="button" class="secondary">Ascending ↑</button>';host.append(controls);
    const table=document.createElement('table');table.className='json-tome-table';table.innerHTML='<thead><tr><th scope="col">Entry</th><th scope="col">Loaded account</th><th scope="col">Pasted JSON</th><th scope="col">Change</th></tr></thead><tbody></tbody>';host.append(table);
    const search=controls.querySelector('input[type=search]'),all=controls.querySelector('input[type=checkbox]'),sort=controls.querySelector('select'),direction=controls.querySelector('button');let reverse=false;all.checked=!!category.showAll;
    if(category.id==='cmp_refinery'){const option=document.createElement('option');option.value='game';option.textContent='Refinery order';sort.prepend(option);sort.value='game';}
    const paint=()=>{direction.textContent=(['delta','value','change'].includes(sort.value)!==reverse)?'Descending \u2193':'Ascending \u2191';const body=table.querySelector('tbody');body.replaceChildren();const shown=pairs.filter(p=>(all.checked||changed(p))&&String((p.b||p.a).name).toLowerCase().includes(search.value.toLowerCase())).sort((x,y)=>{const val=p=>sort.value==='value'?p.b?.value:typeof p.a?.value==='number'&&typeof p.b?.value==='number'?p.b.value-p.a.value:null;const xv=val(x),yv=val(y);if(['delta','value'].includes(sort.value)){if(xv==null&&yv!=null)return 1;if(yv==null&&xv!=null)return -1;}const diff=sort.value==='game'?Number(String((x.b||x.a).id).replace('Refinery',''))-Number(String((y.b||y.a).id).replace('Refinery','')):sort.value==='change'?Number(changed(y))-Number(changed(x)):['delta','value'].includes(sort.value)?(yv??0)-(xv??0):0;return (diff||String((x.b||x.a).name).localeCompare(String((y.b||y.a).name),undefined,{numeric:true}))*(reverse?-1:1);});
      for(const pair of shown){const row=document.createElement('tr'),name=document.createElement('th');name.scope='row';withIcon(name,(pair.b||pair.a).name,(pair.b||pair.a).icon||'assets/'+categoryIcons[category.id],'assets/'+categoryIcons[category.id]);row.append(name);
        for(const entry of [pair.a,pair.b]){const cell=document.createElement('td');cell.textContent=text(entry);if(typeof entry?.value==='number')cell.title=entry.value.toLocaleString('en-US',{maximumFractionDigits:20});if(!collection&&entry?.effect){const effect=document.createElement('small');effect.textContent=entry.effect;cell.append(effect);}row.append(cell);}
        const change=document.createElement('td');change.className='json-change-pill';change.textContent=unavailable(pair)?'Unavailable':!changed(pair)?'Unchanged':collection?(pair.b.status==='maxed'?'Gained':'Lost'):'Updated';if(!unavailable(pair)&&typeof pair.a?.value==='number'&&typeof pair.b?.value==='number'){const diff=pair.b.value-pair.a.value;change.textContent=diff===0&&changed(pair)?'Updated':(diff>0?'+':'')+root.ProgressionModels.fmt(diff);change.title=diff.toLocaleString('en-US',{maximumFractionDigits:20});change.className=diff>0?'json-gain':diff<0?'json-loss':'';}row.append(change);body.append(row);
      }
      if(!shown.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=4;cell.textContent='No matching changes. Enable Show unchanged to see all entries.';row.append(cell);body.append(row);}
    };search.oninput=paint;all.onchange=paint;sort.onchange=paint;direction.onclick=()=>{reverse=!reverse;direction.textContent=reverse?'Descending ↓':'Ascending ↑';paint();};paint();
  }
  const compareObolCoords=[[[264,134,1,32],[330,154,0,0],[398,134,2,105],[466,154,0,40],[532,134,1,60],[286,196,0,25],[346,212,0,130],[450,212,0,152],[512,196,0,48],[274,260,1,190],[398,260,3,250],[522,260,1,140],[346,308,0,210],[450,308,0,170],[286,324,0,112],[330,366,0,98],[466,366,0,70],[512,324,0,80],[264,386,1,120],[398,386,2,180],[532,386,1,90]],[[262,132,0,60],[332,128,0,250],[398,134,1,200],[464,128,0,350],[534,132,0,100],[260,200,0,1250],[324,192,2,400],[398,204,3,650],[472,192,2,900],[536,200,0,1500],[284,262,1,1150],[356,262,3,1200],[440,262,3,2500],[512,262,1,2000],[260,324,0,2100],[324,330,2,3000],[398,322,3,5000],[472,330,2,1750],[536,324,0,400],[262,388,0,160],[332,394,0,875],[398,392,1,700],[464,394,0,470],[534,388,0,80]]];
  function renderObols(host,first,second){
    const {left,right}=pairsFor(first,second,'cmp_obols');
    const heading=document.createElement('h3');heading.textContent='Obols';host.append(heading);
    if(!left.length&&!right.length){host.append('Obol data is unavailable in both saves.');return;}
    const boards=new Map([...left,...right].map(r=>[String(r.id).split(':')[0],r.boardName||r.name.split(' · Slot ')[0]]));
    const controls=document.createElement('div');controls.className='json-tome-controls';
    const label=document.createElement('label');label.textContent='Board ';const select=document.createElement('select');select.setAttribute('aria-label','Obol board');
    for(const [id,name] of boards){const option=document.createElement('option');option.value=id;option.textContent=name;select.append(option);}label.append(select);controls.append(label);host.append(controls);
    const note=document.createElement('p');host.append(note);
    const grid=document.createElement('div');grid.className='json-obol-grid';host.append(grid);
    const detail=document.createElement('div');detail.className='json-obol-details';detail.setAttribute('aria-live','polite');host.append(detail);
    function paint(){
      grid.replaceChildren();const coords=compareObolCoords[select.value==='family'?1:0],maps=[left,right].map(rows=>new Map(rows.filter(r=>String(r.id).split(':')[0]===select.value).map(r=>[Number(String(r.id).split(':')[1]),r])));
      const changed=i=>maps[0].has(i)||maps[1].has(i)?isChanged({a:maps[0].get(i),b:maps[1].get(i)}):false;
      const describe=r=>!r?'Unavailable':r.status==='missing'?'Locked':r.level||'Empty';
      note.textContent=coords.filter((_,i)=>changed(i)).length+' changed slots · Gold outlines mark changes. Select a slot to compare its obol and bonuses.';
      function inspect(index){
        grid.querySelectorAll('[data-slot]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.slot)===index)));detail.replaceChildren();
        for(let side=0;side<2;side++){const r=maps[side].get(index),card=document.createElement('section'),title=document.createElement('h4'),name=document.createElement('strong'),stats=document.createElement('p');title.textContent=(side?'Pasted JSON':'Loaded account')+' · Slot '+(index+1);name.textContent=describe(r);if(r?.icon&&r.status!=='missing')withIcon(name,describe(r),r.icon);stats.textContent=!r?'This slot is unavailable in this save.':r.status==='missing'?'Requires '+(select.value==='family'?'account':'character')+' level '+coords[index][3]+'.':r.effect||'No equipped bonuses.';card.append(title,name,stats);detail.append(card);}
      }
      for(let side=0;side<2;side++){const panel=document.createElement('section'),title=document.createElement('h4'),board=document.createElement('div');panel.className='json-obol-panel';title.textContent=side?'Pasted JSON':'Loaded account';board.className='json-obol-board';panel.append(title,board);grid.append(panel);
        coords.forEach(([x,y,shape],i)=>{const r=maps[side].get(i),button=document.createElement('button');button.type='button';button.dataset.slot=i;button.className='json-obol-slot shape-'+shape+(changed(i)?' changed':'')+(r?.status==='missing'?' locked':'');button.style.left=(x-230)/340*100+'%';button.style.top=(y-98)/330*100+'%';button.setAttribute('aria-label',title.textContent+', slot '+(i+1)+', '+describe(r)+(changed(i)?', changed':''));button.title='Slot '+(i+1)+' · '+describe(r);if(r?.icon&&r.status!=='missing'){const img=document.createElement('img');img.src=r.icon;img.alt='';button.append(img);}else button.textContent=!r?'?':r.status==='missing'?'−':'+';button.onclick=()=>inspect(i);board.append(button);});
      }
      inspect(Math.max(0,coords.findIndex((_,i)=>changed(i))));
    }
    select.onchange=paint;paint();
  }
  function renderSpelunkDepths(host,first,second){
    const {left,right}=pairsFor(first,second,'cmp_spelunking');
    const title=document.createElement('h3');withIcon(title,'Depths','assets/nav-Spelunking.png');host.append(title);
    const note=document.createElement('p');note.textContent='Best saved depth per tunnel · loaded account → pasted JSON. Missing records are unavailable, not zero.';host.append(note);
    if(!left.length||!right.length){note.textContent='Spelunking data is unavailable in one or both saves.';return;}
    const tunnels=[...new Set([...left,...right].filter(r=>r.section==='depths').map(r=>r.tunnel))];
    const find=(rows,id,mode)=>rows.find(r=>r.tunnel===id&&r.mode===mode);
    const rows=tunnels.map(id=>({id,regular:[find(left,id,'regular'),find(right,id,'regular')],manic:[find(left,id,'manic'),find(right,id,'manic')]}));
    const value=r=>typeof r?.value==='number'?r.value:null,delta=pair=>pair.every(r=>value(r)!==null)?pair[1].value-pair[0].value:null;
    const changed=r=>r.regular.some((x,i)=>value(x)!==value(r.regular[1-i]))||r.manic.some((x,i)=>value(x)!==value(r.manic[1-i]));
    const controls=document.createElement('div');controls.className='json-tome-controls';controls.innerHTML='<input type="search" aria-label="Search tunnels" placeholder="Find a tunnel…"><label><input type="checkbox"> Show unchanged</label><label>Sort <select aria-label="Sort depths"><option value="name">Tunnel</option><option value="regular">Regular gain</option><option value="manic">Manic gain</option></select></label><button type="button" class="secondary">Reverse order</button>';host.append(controls);
    const table=document.createElement('table');table.className='json-tome-table';table.innerHTML='<thead><tr><th scope="col">Tunnel</th><th scope="col">Regular depth</th><th scope="col">Change</th><th scope="col">Manic depth</th><th scope="col">Change</th></tr></thead><tbody></tbody>';host.append(table);
    const search=controls.querySelector('input[type=search]'),all=controls.querySelector('input[type=checkbox]'),sort=controls.querySelector('select');let reverse=false;
    const name=r=>(r.regular[0]||r.regular[1]||r.manic[0]||r.manic[1]);
    const fmt=n=>n===null?'Unavailable':root.ProgressionModels.fmt(n);
    function paint(){const body=table.querySelector('tbody');body.replaceChildren();const shown=rows.filter(r=>(all.checked||changed(r))&&name(r).name.toLowerCase().includes(search.value.toLowerCase())).sort((a,b)=>{if(sort.value==='name')return name(a).name.localeCompare(name(b).name)*(reverse?-1:1);const x=delta(a[sort.value]),y=delta(b[sort.value]);if(x===null)return y===null?0:1;if(y===null)return -1;return (y-x)*(reverse?-1:1);});
      for(const r of shown){const tr=document.createElement('tr'),th=document.createElement('th');th.scope='row';withIcon(th,name(r).name,name(r).icon);tr.append(th);for(const mode of ['regular','manic']){const pair=r[mode],cell=document.createElement('td');cell.textContent=fmt(value(pair[0]))+' → '+fmt(value(pair[1]));cell.title=pair.map(v=>value(v)??'Unavailable').join(' → ');const diff=delta(pair),change=document.createElement('td');change.textContent=diff===null?'Unavailable':(diff>0?'+':'')+fmt(diff);change.className=diff>0?'json-gain':diff<0?'json-loss':'';tr.append(cell,change);}body.append(tr);}
      if(!shown.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=5;td.textContent='No matching depth changes. Enable Show unchanged to see all tunnels.';tr.append(td);body.append(tr);}
    }
    search.oninput=paint;all.onchange=paint;sort.onchange=paint;controls.querySelector('button').onclick=()=>{reverse=!reverse;paint();};paint();
  }
  function render(host,getLoadedJson=()=>null){
    const hasSave=getLoadedJson()!=null;
    host.innerHTML='<section class="json-compare"><div class="section-head compact"><div><p class="eyebrow">Misc</p><h2>Compare JSONs</h2><p>Compare account progress: loaded save → second save.</p></div></div><p data-baseline></p><details data-input open><summary>Second save JSON</summary><div class="json-compare-inputs" style="grid-template-columns:minmax(0,1fr)"><div><label for="jsonCompare1">Second JSON</label><textarea id="jsonCompare1" spellcheck="false" placeholder="Paste the second JSON here"></textarea></div></div><div class="json-compare-actions"><button type="button" class="primary" data-compare>Compare JSONs</button><button type="button" class="secondary" data-clear>Clear</button></div></details><div class="json-compare-actions"><button type="button" class="secondary" data-save-json>Save last JSON</button><small data-save-note role="status" aria-live="polite"></small></div><p data-status role="status" aria-live="polite"></p><nav class="skill-tabs json-compare-tabs" aria-label="Comparison world" data-world-tabs></nav><nav class="skill-tabs" aria-label="Comparison category" data-category-tabs></nav><div data-results></div></section>';
    const status=host.querySelector('[data-status]'),results=host.querySelector('[data-results]'),area=host.querySelector('#jsonCompare1');
    host.querySelector('[data-baseline]').textContent=hasSave?'First JSON: currently loaded save.':'No save loaded. Import your save using the main JSON import first.';
    host.querySelector('[data-compare]').disabled=!hasSave;
    status.textContent=hasSave?'Paste the second JSON to start.':'Waiting for a loaded save.';
    let request=0,decoded=null,activeWorld=0,activeCategory='overview',spelunkTab='grand',galleryTab='trophy';
    const worlds=host.querySelector('[data-world-tabs]'),categoryTabs=host.querySelector('[data-category-tabs]');
    function tabs(){
      worlds.replaceChildren();categoryTabs.replaceChildren();
      const overview=document.createElement('button');overview.type='button';overview.className='skill-tab'+(activeWorld===0?' active':'');overview.textContent='Overview';overview.setAttribute('aria-pressed',String(activeWorld===0));overview.onclick=()=>{activeWorld=0;activeCategory='overview';tabs();show();};worlds.append(overview);
      for(let world=1;world<=7;world++){const button=document.createElement('button');button.type='button';button.className='skill-tab'+(activeWorld===world?' active':'');withIcon(button,'W'+world,'assets/'+worldIcons[world-1]);button.setAttribute('aria-pressed',String(activeWorld===world));button.onclick=()=>{activeWorld=world;activeCategory=categories.find(c=>c.world===world)?.id;tabs();show();};worlds.append(button);}
      for(const category of categories.filter(c=>c.world===activeWorld)){const button=document.createElement('button');button.type='button';button.className='skill-tab'+(category.id===activeCategory?' active':'');withIcon(button,category.name,'assets/'+categoryIcons[category.id]);button.setAttribute('aria-pressed',String(category.id===activeCategory));button.onclick=()=>{activeCategory=category.id;tabs();show();};categoryTabs.append(button);}
    }
    const sectionTabs={};
    function renderSections(first,second,category){
      const rows=[...comparisonRows(first,category.id),...comparisonRows(second,category.id)],sections=[...new Set(rows.map(r=>r.section||r.group||'Progress'))];
      if(!sections.length){renderComparison(results,first,second,category);return;}
      const active=sections.includes(sectionTabs[category.id])?sectionTabs[category.id]:sections[0],nav=document.createElement('nav');nav.className='skill-tabs json-section-tabs';nav.setAttribute('aria-label',category.name+' sections');results.append(nav);
      for(const name of sections){const button=document.createElement('button');button.type='button';button.textContent=name;button.className='skill-tab'+(name===active?' active':'');button.setAttribute('aria-pressed',String(name===active));button.onclick=()=>{sectionTabs[category.id]=name;show();};nav.append(button);}
      const content=document.createElement('div');results.append(content);const filtered=groups=>({...groups,[category.id]:comparisonRows(groups,category.id).filter(r=>(r.section||r.group||'Progress')===active)});
      const key=category.id==='cmp_hole'?'cmp_hole_section':category.id;categoryIcons[key]=categoryIcons[category.id];const prepare=groups=>({...filtered(groups),[key]:filtered(groups)[category.id]});
      renderComparison(content,prepare(first),prepare(second),{...category,id:key,name:category.name+' · '+active});
    }
    function show(){results.replaceChildren();if(!activeCategory){results.textContent='No comparisons added for World '+activeWorld+' yet.';return;}if(!decoded){results.textContent='Compare two saves to see this category.';return;}const [first,second]=decoded;status.textContent='Comparison ready. Select a world and category.';if(activeCategory==='overview')renderOverview(results,first,second,category=>{activeWorld=category.world;activeCategory=category.id;tabs();show();});else if(activeCategory==='cmp_spelunking')renderSpelunking(first,second);else if(activeCategory==='cmp_obols')renderObols(results,first,second);else if(activeCategory==='cmp_gallery')renderGallery(first,second);else if(['cmp_hole','cmp_minehead','cmp_jelly','cmp_sneaking','cmp_equinox','dungeons','clamworks'].includes(activeCategory))renderSections(first,second,categories.find(c=>c.id===activeCategory));else if(activeCategory==='tome')renderTome(first,second);else renderComparison(results,first,second,categories.find(c=>c.id===activeCategory));}
    tabs();show();
    area.value=draft;
    const saveNote=host.querySelector('[data-save-note]');
    if(restored)saveNote.textContent='Last saved JSON restored from this browser.';
    host.querySelector('[data-save-json]').onclick=()=>{
      let parsed;
      try{parsed=JSON.parse(draft);}catch{saveNote.textContent='Paste valid JSON before saving.';host.querySelector('[data-input]').open=true;area.focus();return;}
      if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)){saveNote.textContent='Paste a complete save export before saving.';return;}
      try{root.localStorage.setItem(savedJsonKey,draft);restored=false;saveNote.textContent='Saved in this browser. This JSON will return when you reopen the comparison.';}catch{saveNote.textContent='Could not save: browser storage is full or unavailable.';}
    };
    area.oninput=()=>{request++;decoded=null;restored=false;saveNote.textContent='';draft=area.value;results.replaceChildren();status.textContent='Select Compare JSONs to refresh the results.';};
    host.querySelector('[data-clear]').onclick=()=>{draft='';restored=false;render(host,getLoadedJson);};
    host.querySelector('[data-compare]').onclick=async()=>{
      const token=++request;decoded=null;results.replaceChildren();const before=getLoadedJson();
      if(before==null){status.textContent='Import your save using the main JSON import first.';return;}
      let after;
      try{after=JSON.parse(draft);}catch(error){status.textContent='Second JSON is invalid: '+error.message;area.focus();return;}
      if(!after||typeof after!=='object'||Array.isArray(after)){status.textContent='Paste a complete IdleOn save to compare account progress.';return;}
      status.textContent='Reading progress from both saves…';
      try{
        const first=await root.BonusSystems.getRowsAsync(before);
        const second=await root.BonusSystems.getRowsAsync(after);
        if(token!==request||!host.contains(results))return;
        decoded=[first,second];host.querySelector('[data-input]').open=false;status.textContent='Comparison ready. Select a world and category.';show();
      }catch(error){if(token===request&&host.contains(results))status.textContent='Could not read account progress. Check that the second JSON is a complete save export.';}

    };
    function renderGallery(first,second){
      const nav=document.createElement('nav');nav.className='skill-tabs';nav.setAttribute('aria-label','Gallery comparisons');results.append(nav);
      for(const [id,label,icon] of [['trophy','Trophies','Trophy1.png'],['tag','Nametags','NametagLeft_1.png']]){
        const button=document.createElement('button');button.type='button';button.className='skill-tab'+(galleryTab===id?' active':'');withIcon(button,label,'assets/'+icon);button.setAttribute('aria-pressed',String(galleryTab===id));button.onclick=()=>{galleryTab=id;show();};nav.append(button);
      }
      const content=document.createElement('div');results.append(content);
      const filter=groups=>({...groups,cmp_gallery:(groups.cmp_gallery||[]).filter(r=>String(r.id).startsWith(galleryTab+':'))});
      renderComparison(content,filter(first),filter(second),{id:'cmp_gallery',name:galleryTab==='trophy'?'Trophies':'Nametags'});
    }
    function renderSpelunking(first,second){
      const nav=document.createElement('nav');nav.className='skill-tabs json-spelunk-tabs';nav.setAttribute('aria-label','Spelunking comparisons');results.append(nav);
      const content=document.createElement('div');results.append(content);
      for(const [id,label] of [['grand','Grand Discoveries'],['depths','Depths'],['lore','Lore'],['upgrades','Upgrades'],['amber','Amber'],['rocks','Rock Discoveries']]){const button=document.createElement('button');button.type='button';button.className='skill-tab'+(spelunkTab===id?' active':'');withIcon(button,label,'assets/'+({grand:'CaveDoor0.png',depths:'CaveDoor1.png',lore:'Spelunking0.png',upgrades:'CaveShopUpg0.png',amber:'CaveShopUpg3.png',rocks:'CaveRock_0.png'})[id]);button.setAttribute('aria-pressed',String(spelunkTab===id));button.onclick=()=>{spelunkTab=id;show();};nav.append(button);}
      if(spelunkTab==='depths'){renderSpelunkDepths(content,first,second);return;}
      const filter=groups=>({...groups,cmp_spelunking:(groups.cmp_spelunking||[]).filter(r=>r.section===spelunkTab)});
      renderComparison(content,filter(first),filter(second),{id:'cmp_spelunking',name:({grand:'Grand Discoveries',lore:'Lore · Chapter Bonuses',upgrades:'Shop Upgrades',amber:'Amber · Best Haul per Tunnel',rocks:'Rock Discoveries'})[spelunkTab],showAll:['grand','lore'].includes(spelunkTab)});
    }
    function renderTome(first,second){
        const left=first.tome||[],right=second.tome||[];
        if(!left.length||!right.length){status.textContent='Tome progress is unavailable in one of these saves. Paste a complete save export.';return;}
        const missing=r=>({id:r.id,name:r.name,icon:r.icon,value:null,score:null,status:'unknown'});
        const pairs=pairsFor(first,second,'tome').pairs.map(({a,b})=>({a:a||missing(b),b:b||missing(a)}));
        const changed=pairs.filter(({a,b})=>a.value!==b.value||a.score!==b.score||a.status!==b.status);
        const exact=value=>typeof value==='number'&&Number.isFinite(value)?value.toLocaleString('en-US',{maximumFractionDigits:20}):'Unavailable';
        const fmt=value=>typeof value==='number'&&Number.isFinite(value)?root.ProgressionModels.fmt(value):'Unavailable';
        const delta=(a,b)=>typeof a==='number'&&typeof b==='number'?(b-a>0?'+':'')+fmt(b-a):'Unavailable';
        const total=rows=>rows.reduce((sum,r)=>sum+(r.score??0),0);
        const partial=rows=>rows.length!==pairs.length||rows.some(r=>r.score==null);
        status.textContent=changed.length?changed.length+' Tome metrics changed.':'No changes in the available Tome metrics.';
        host.querySelector('[data-input]').open=false;
        const heading=document.createElement('h3');withIcon(heading,'Tome points','assets/TomeClaim.png');results.append(heading);
        const totals=document.createElement('div');totals.className='json-tome-totals';
        const loadedPoints=total(left),secondPoints=total(right),pointChange=secondPoints-loadedPoints;
        for(const [label,value,detail,kind] of [
          ['Loaded account',exact(loadedPoints),partial(left)?'Known points · incomplete':'Calculated Tome points',''],
          ['Pasted JSON',exact(secondPoints),partial(right)?'Known points · incomplete':'Calculated Tome points',''],
          ['Difference',(pointChange>0?'+':'')+exact(pointChange),(partial(left)||partial(right))?'Known points only':pointChange>0?'More points in pasted save':pointChange<0?'Fewer points in pasted save':'Same total points',pointChange>0?'json-gain':pointChange<0?'json-loss':'']
        ]){
          const card=document.createElement('div'),title=document.createElement('span'),number=document.createElement('strong'),caption=document.createElement('small');
          title.textContent=label;number.textContent=value;number.className=kind;caption.textContent=detail;card.append(title,number,caption);totals.append(card);
        }
        results.append(totals);
        const note=document.createElement('p');note.className='json-tome-note';note.textContent='Loaded → second save · Highest-scoring character in each save.'+(partial(left)||partial(right)?' Totals include known metrics only.':'');results.append(note);
        const controls=document.createElement('div');controls.className='json-tome-controls';
        controls.innerHTML='<input type="search" aria-label="Search Tome metrics" placeholder="Find a metric…"><label><input type="checkbox" data-all> Show unchanged</label><label>Sort <select aria-label="Sort Tome metrics"><option value="delta">Point change</option><option value="name">Name</option><option value="progress">Progress change</option><option value="loadedScore">Loaded points</option><option value="score">Pasted points</option></select></label><button type="button" class="secondary" data-direction aria-label="Reverse sort direction">Descending ↓</button><span data-count></span>';results.append(controls);
        const table=document.createElement('table');table.className='json-tome-table';table.innerHTML='<thead><tr><th scope="col">Metric</th><th scope="col">Progress</th><th scope="col">Loaded points</th><th scope="col">Pasted points</th><th scope="col">Point change</th></tr></thead><tbody></tbody>';results.append(table);
        const body=table.querySelector('tbody'),search=controls.querySelector('input[type=search]'),all=controls.querySelector('[data-all]'),sort=controls.querySelector('select'),direction=controls.querySelector('[data-direction]');let descending=true;
        const numeric=(a,b)=>typeof a==='number'&&typeof b==='number'?b-a:null;
        const sortValue=({a,b})=>sort.value==='name'?a.name:sort.value==='score'?b.score:sort.value==='loadedScore'?a.score:numeric(a[sort.value==='progress'?'value':'score'],b[sort.value==='progress'?'value':'score']);
        const labels={missing:'Locked',unknown:'Unavailable',maxed:'Maxed',active:'In progress'};
        function paint(){
          const query=search.value.trim().toLowerCase();
          const shown=(all.checked?pairs:changed).filter(({a})=>a.name.toLowerCase().includes(query)).slice().sort((x,y)=>{
            const a=sortValue(x),b=sortValue(y);if(a==null)return b==null?x.a.id-y.a.id:1;if(b==null)return -1;
            const order=typeof a==='string'?a.localeCompare(b):a-b;return (descending?-order:order)||x.a.id-y.a.id;
          });
          direction.textContent=descending?'Descending ↓':'Ascending ↑';controls.querySelector('[data-count]').textContent=shown.length+' metrics';body.replaceChildren();
          const activeColumn={name:0,progress:1,loadedScore:2,score:3,delta:4}[sort.value];table.querySelectorAll('thead th').forEach((th,i)=>{if(i===activeColumn)th.setAttribute('aria-sort',descending?'descending':'ascending');else th.removeAttribute('aria-sort');});
          for(const {a,b} of shown){
            const row=document.createElement('tr'),name=document.createElement('th');name.scope='row';withIcon(name,a.name.replace(/\bLV\b/g,'Level'),a.icon||'assets/TomeClaim.png');
            if(a.status!==b.status||b.status==='missing'||b.status==='unknown'){const state=document.createElement('small');state.textContent=a.status===b.status?labels[b.status]:(labels[a.status]+' → '+labels[b.status]);name.append(state);}row.append(name);
            for(const key of ['value']){const cell=document.createElement('td');cell.textContent=fmt(a[key])+' → '+fmt(b[key]);cell.title=exact(a[key])+' → '+exact(b[key]);if(key==='value'&&numeric(a.value,b.value)!==null&&a.value!==b.value){const change=document.createElement('small');change.textContent=delta(a.value,b.value);change.title=(b.value-a.value>0?'+':'')+exact(b.value-a.value);cell.append(change);}row.append(cell);}
            for(const metric of [a,b]){const points=document.createElement('td');points.textContent=exact(metric.score);row.append(points);}
            const change=document.createElement('td'),diff=numeric(a.score,b.score);change.textContent=diff===null?'Unavailable':(diff>0?'+':'')+exact(diff);change.title=diff===null?'Unavailable':(diff>0?'+':'')+exact(diff);change.className=diff>0?'json-gain':diff<0?'json-loss':'';row.append(change);body.append(row);
          }
          if(!shown.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=5;cell.textContent=query?'No metrics match your search.':'No changed metrics. Enable Show unchanged to see all.';row.append(cell);body.append(row);}
        }
        search.oninput=paint;all.onchange=paint;sort.onchange=()=>{descending=sort.value!=='name';paint();};direction.onclick=()=>{descending=!descending;paint();};paint();

    }
  }
  root.JsonCompare={compare,render};
  if(typeof module!=='undefined')module.exports={compare};
})(typeof window!=='undefined'?window:globalThis);
