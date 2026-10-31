(function(root){

  'use strict';

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const tiers=[

    {name:'S · Shiny speed first',ids:[16],why:'Faster shiny leveling speeds up every later pet. Build this foundation first.'},

    {name:'A · Account progression',ids:[20,15,0,21,3],why:'Meals, refinery, drop rate, artifacts and infinite star signs support broad account progress. Move star signs down once you have enough infinite signs.'},

    {name:'B · Useful system boosts',ids:[18,4,13,12,14,23,22],why:'Travel time, multikill, talent points and skilling resources. Move a bonus up when it removes your current bottleneck.'},

    {name:'C · Situational gains',ids:[17,24,25,1,2,19,10,11,5],why:'EXP, lab width, early talent points and damage. Prioritize these when that specific system needs help.'},

    {name:'D · Finish last',ids:[6,7,8,9],why:'Flat base stats usually offer less account progress than speed and system bonuses.'}

  ];

  const tier=id=>{const i=tiers.findIndex(t=>t.ids.includes(id));return i<0?3:i;};

  const numeric=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v));

  function estimate(pet,target,copies,speed,kills,enhanced){

    if(!pet||!numeric(pet.progress)||pet.level===null)return {error:'Saved shiny progress is missing.'};

    if(!Number.isInteger(target)||target<1||target>(pet.maxLevel||20))return {error:'Choose a target within the unlocked level cap.'};

    if(pet.level>=target)return {passive:0,active:0,boost:1};

    if(pet.level===0)return {error:'Hatch this shiny first. Hatching time is not included.'};

    if(!numeric(copies)||!Number.isInteger(Number(copies))||copies<0||copies>27)return {error:'Enter a whole number of shiny copies from 0 to 27.'};

    if(Number(copies)===0)return {error:'No progress with zero shiny copies in the Fenceyard.'};

    if(!numeric(speed)||speed<=0)return {error:'Enter a positive shiny speed multiplier.'};

    const threshold=Math.floor((1+(target-1)**1.6)*1.7**(target-1));

    // The client requires strictly greater progress, including at exact equality.

    const remaining=Math.max(Number.EPSILON*Math.max(1,threshold),threshold-Number(pet.progress));

    const passive=remaining*86400/(Number(speed)*Number(copies));

    const validKills=numeric(kills)&&Number(kills)>=0;

    const boost=enhanced&&validKills?1+Number(kills)*0.5*3/3600:1;

    return {passive,active:enhanced&&!validKills?null:passive/boost,boost,remaining};

  }

  // Event simulation: all assigned copies stay in the yard, including after their target.
  function estimateLineup(allPets,targets,speed,kills,enhanced,additive=1){
    const results=allPets.map((p,i)=>estimate(p,targets[i],p.copies,speed,kills,enhanced));
    const states=allPets.map((p,i)=>({...p,index:i,progress:Number(p.progress),level:p.level}));
    const initialOver=states.reduce((n,p)=>n+Math.max(0,(p.level||0)-20),0);
    let over=initialOver,added=0,elapsed=0;
    const pending=new Set(results.flatMap((r,i)=>!r.error&&r.passive>0?[i]:[]));
    const threshold=level=>Math.floor((1+(level-1)**1.6)*1.7**(level-1));
    const boost=enhanced&&numeric(kills)&&Number(kills)>=0?1+Number(kills)*1.5/3600:1;
    for(let step=0;pending.size&&step<allPets.length*31;step++){
      const moving=states.filter(p=>p.level>0&&p.level<(p.maxLevel||20)&&numeric(allPets[p.index].progress)&&Number.isInteger(Number(p.copies))&&Number(p.copies)>0&&Number(p.copies)<=27);
      const rate=Number(speed)*(1+over/10)/(1+initialOver/10)*(1+added/Math.max(1,additive));
      const events=moving.map(p=>({p,dt:Math.max(Number.EPSILON*Math.max(1,threshold(p.level+1)),threshold(p.level+1)-p.progress)*86400/(rate*p.copies)}));
      const dt=Math.min(...events.map(e=>e.dt));
      if(!Number.isFinite(dt))break;
      elapsed+=dt;
      for(const p of moving)p.progress+=dt*rate*p.copies/86400;
      for(const {p,dt:next} of events){
        if(Math.abs(next-dt)>Math.max(1e-9,dt*1e-12))continue;
        p.level++;
        p.progress=Math.max(p.progress,threshold(p.level));
        if(p.level>20)over++;
        if(p.bonusId===16)added+=(Number(String(p.perLevel||'').match(/[\d.]+/)?.[0])||0)/100;
        if(pending.has(p.index)&&p.level>=targets[p.index]){
          results[p.index]={...results[p.index],passive:elapsed,active:enhanced&&!numeric(kills)?null:elapsed/boost};
          pending.delete(p.index);
        }
      }
    }
    return results;
  }

  const duration=seconds=>seconds===null?'Enter full-map clear time':seconds===0?'Target reached':seconds<1?'<1 second':seconds<3600?`${Math.ceil(seconds/60).toLocaleString()} min`:seconds<86400?`${(seconds/3600).toLocaleString('en-US',{maximumFractionDigits:1})} hours`:`${(seconds/86400).toLocaleString('en-US',{maximumFractionDigits:1})} days`;

  let timeWorker,timeTimer;

  function mountTime(host,model,raw,name){

    timeWorker?.terminate();clearTimeout(timeTimer);

    const pets=model.pets;if(!pets.length)return;

    host.innerHTML=`<h3>Leveling time</h3><div class="shiny-time-fields"><label>Pet<select data-time="pet" aria-label="Timing pet">${pets.map((p,i)=>`<option value="${i}">${esc(name(p))} · ${p.level===null?'Unknown':`Lv ${p.level}`}</option>`).join('')}</select></label><label>Target level<input data-time="target" aria-label="Target shiny level" type="number" min="1" step="1"></label><label>Copies in Fenceyard<input data-time="copies" aria-label="Shiny copies" type="number" min="0" max="27" step="1"></label><label>Character<select data-time="character" aria-label="Shiny timing character"><option>Loading saved bonuses…</option></select></label><label>Shiny speed (×)<input data-time="speed" aria-label="Shiny speed multiplier" type="number" min="0" step="any" placeholder="Loading…"></label><label>Clear time<select data-time="mode" aria-label="Clear-time calculation"><option value="auto">Automatic estimate</option><option value="manual">Measured clear time</option></select></label><label>Seconds per clear<input data-time="clear" aria-label="Full-map clear time" type="number" min="0.1" step="any" placeholder="Calculated per map" disabled></label><label>Map<input type="search" data-time="mapSearch" aria-label="Search shiny farming maps" placeholder="Search mob or map name…"><select data-time="map" aria-label="Shiny farming map"><option>Loading maps...</option></select></label></div><label class="shiny-time-enhanced"><input data-time="uwu" type="checkbox"> UWU Rawrrr active</label><label class="shiny-time-enhanced"><input data-time="enhanced" type="checkbox"> Enhanced Whale Wallop active</label><p class="shiny-time-source"></p><div class="shiny-time-results" aria-live="polite"></div><small class="shiny-time-note">Estimates from your imported save.</small>`;

    const field=k=>host.querySelector(`[data-time="${k}"]`),results=host.querySelector('.shiny-time-results'),source=host.querySelector('.shiny-time-source');

    const settings=document.createElement('details');settings.className='shiny-time-settings';
    settings.innerHTML='<summary>Settings</summary><div class="shiny-time-fields"></div>';
    results.before(settings);
    for(const key of ['character','speed','mode','clear'])settings.querySelector('.shiny-time-fields').append(field(key).closest('label'));
    host.querySelectorAll('.shiny-time-enhanced').forEach(el=>settings.append(el));
    settings.append(source);
    const note=document.createElement('p');note.className='shiny-time-note';
    note.textContent='Automatic clears estimate basic attacks. For better active times, enter a measured clear time (excluding respawn). Enhanced Whale Wallop requires Enhancement Eclipse Lv 150. UWU assumes the buff stays active. Includes shiny-speed and overlevel gains. Copies stay in the Fenceyard after reaching their target; other bonuses stay fixed.';
    settings.append(note);
    field('map').closest('label').classList.add('shiny-map-field');
    let manual=false,characters=[],maps=[],kills='',request=0,rankRequest=0;
    const current=document.createElement('section');current.className='shiny-current';host.prepend(current);
    const yardControls=document.createElement('div');yardControls.className='shiny-yard-controls';
    const yardCap=Math.max(...pets.map(p=>p.maxLevel||20));
    yardControls.innerHTML='<h3>In the Fenceyard</h3><label>Level all to <input type="number" min="1" max="'+yardCap+'" step="1" placeholder="Next level" aria-label="Fenceyard target level"></label>';
    current.before(yardControls);
    const yardTarget=yardControls.querySelector('input');
    yardTarget.oninput=()=>paintCurrent();
    const paintCurrent=()=>{
      const active=pets.filter(p=>Number(p.copies)>0),unknown=pets.some(p=>p.copies==null);
      const custom=yardTarget.value!=='';
      const wanted=Number(yardTarget.value);
      if(yardTarget.validity.badInput||(custom&&(!Number.isInteger(wanted)||wanted<1||wanted>yardCap))){current.innerHTML='<p>Enter a level from 1 to '+yardCap+'.</p>';return;}
      const targets=pets.map(p=>custom?wanted:Math.min(p.maxLevel||20,(p.level||0)+1));
      const projected=estimateLineup(pets,targets,field('speed').value,kills,field('enhanced').checked,characters[Number(field('character').value)]?.additive||1);
      const timeFor=p=>{
        const r=projected[pets.indexOf(p)];
        if(r.error)return Infinity;
        const seconds=field('enhanced').checked?(r.active??r.passive):r.passive;
        return Number.isFinite(seconds)?seconds:Infinity;
      };
      active.sort((a,b)=>timeFor(a)-timeFor(b)||name(a).localeCompare(name(b)));
      const estimates=[];
      current.innerHTML=(!active.length?'<p>'+ (unknown?'Fenceyard records unavailable. Import a complete save to see your current shinies.':'No shiny pets in the saved Fenceyard.')+'</p>':active.map(p=>{
        const capped=p.level!==null&&p.level>=(p.maxLevel||20),target=custom?wanted:Math.min(p.maxLevel||20,(p.level||0)+1);
        const r=projected[pets.indexOf(p)];
        estimates.push(r);
        const timing=custom&&p.level!==null&&p.level>=target?'Target reached':capped?'Max level reached':r.error?(!numeric(field('speed').value)?'Set shiny speed in Settings.':r.error):'Passive: '+duration(r.passive)+(field('enhanced').checked?' · Active estimate: '+(r.active===null?'map rate needed':duration(r.active)):'');
        return '<article class="shiny-current-pet"><div class="shiny-current-heading">'+(p.icon?'<img src="'+esc(p.icon)+'" alt="" loading="lazy">':'')+'<strong>'+esc(name(p))+'</strong></div><span>'+p.copies+' shiny '+(p.copies===1?'copy':'copies')+' · '+(p.level===null?'Level unknown':'Lv '+p.level+(capped?'':' → '+target))+'</span><div class="shiny-current-times">'+timing.split(' · ').map(t=>'<span>'+esc(t.replace('Active estimate:', 'Active:'))+'</span>').join('')+'</div></article>';
      }).join(''));
      if(custom&&active.length){
        const summary=document.createElement('p');summary.className='shiny-yard-total';
        summary.textContent=estimates.some(r=>r.error)?'Total time unavailable for this target.':'All reach Lv '+wanted+' · Passive: '+duration(Math.max(...estimates.map(r=>r.passive)))+(field('enhanced').checked?' · Active estimate: '+(estimates.some(r=>r.active===null)?'map rate needed':duration(Math.max(...estimates.map(r=>r.active)))):'');
        current.prepend(summary);
      }
    };
    const filterMaps=()=>{
      const selected=field('map').value,q=field('mapSearch').value.trim().toLowerCase();
      const shown=maps.map((m,i)=>({...m,rank:i+1})).filter(m=>(m.name+' '+(m.mob||'')).toLowerCase().includes(q));
      field('map').innerHTML=shown.map(m=>'<option value="'+m.id+'">'+m.rank+'. '+esc(m.name)+(m.mob?' · '+esc(m.mob):'')+(Object.hasOwn(m,'kills')?' - '+(m.kills===null?'Clear time needed':Math.round(m.kills).toLocaleString()+' kills/hr'):'')+'</option>').join('')||'<option value="">No maps match your search</option>';
      field('map').disabled=!shown.length;
      if(shown.some(m=>String(m.id)===selected))field('map').value=selected;
      selectMap();
    };
    field('mapSearch').oninput=filterMaps;

    const mapRate=document.createElement('p');mapRate.className='shiny-time-source';source.after(mapRate);

    const selectMap=()=>{++request;kills='';paint();if(!field('map').value){mapRate.textContent='No maps match your search.';return;}if(!timeWorker||!characters.length)return;mapRate.textContent='Estimating active kills on this map...';timeWorker.postMessage({type:'map',character:characters[Number(field('character').value)].index,clearSeconds:field('clear').value,mode:field('mode').value,uwu:field('uwu').checked,map:Number(field('map').value),request:++request});};

    const rankMaps=()=>{++request;field('map').disabled=true;mapRate.textContent='Ranking maps from best to worst...';kills='';paint();timeWorker.postMessage({type:'rank',character:characters[Number(field('character').value)].index,clearSeconds:field('clear').value,mode:field('mode').value,uwu:field('uwu').checked,request:++rankRequest});};
    const paint=()=>{paintCurrent();const p=pets[Number(field('pet').value)],r=estimateLineup(pets.map(x=>x===p?{...x,copies:field('copies').value}:x),pets.map(x=>x===p?Number(field('target').value):(x.level||1)),field('speed').value,kills,field('enhanced').checked,characters[Number(field('character').value)]?.additive||1)[Number(field('pet').value)];results.innerHTML=r.error?`<p>${esc(r.error)}</p>`:`<article><span>AFK / passive</span><strong>${duration(r.passive)}</strong></article><article><span>Active · ${r.active===null?'rate needed':`${r.boost.toLocaleString('en-US',{maximumFractionDigits:2})}× speed`}</span><strong>${duration(r.active)}</strong></article>`;};

    const selectPet=()=>{const p=pets[Number(field('pet').value)];field('target').max=p.maxLevel||20;field('target').value=p.target||Math.min(p.maxLevel||20,(p.level||0)+1);field('copies').value=p.copies??'';paint();};

    field('pet').onchange=selectPet;

    for(const k of ['target','copies','enhanced'])field(k).oninput=paint;

    field('speed').oninput=()=>{manual=true;source.textContent='Custom speed.';paint();};

    const selectCharacter=()=>{const c=characters[Number(field('character').value)];if(!c||!numeric(c.rate)||c.rate<=0)return;field('speed').value=Number(c.rate.toPrecision(8));source.textContent=`Saved speed · ${c.name}`;manual=false;rankMaps();};

    field('mode').onchange=()=>{field('clear').disabled=field('mode').value==='auto';field('clear').placeholder=field('mode').value==='auto'?'Calculated per map':'Enter observed clear time';if(characters.length)rankMaps();};field('character').onchange=selectCharacter;field('map').onchange=selectMap;field('clear').oninput=()=>{if(characters.length)rankMaps();};field('uwu').onchange=()=>{if(characters.length)rankMaps();};selectPet();

    if(!raw){field('mode').value='manual';field('mode').disabled=true;field('clear').disabled=false;field('map').innerHTML='<option>Map estimate unavailable</option>';field('character').innerHTML='<option>Manual setup</option>';field('speed').placeholder='Enter in-game multiplier';return;}

    const worker=timeWorker=new Worker('shiny-time-worker.js');

    const finish=()=>{worker.terminate();if(timeWorker===worker){timeWorker=null;clearTimeout(timeTimer);}};

    const fail=()=>{finish();if(!host.isConnected)return;field('map').innerHTML='<option>Map estimate unavailable</option>';field('character').innerHTML='<option>Manual setup</option>';field('speed').placeholder='Enter in-game multiplier';if(!manual)source.textContent='Saved speed unavailable. Enter your in-game shiny speed multiplier.';};

    worker.onerror=fail;timeTimer=setTimeout(fail,60000);

    worker.onmessage=e=>{if(!host.isConnected){finish();return;}const data=e.data;

      if(data.type==='rank'){
        if(data.request!==rankRequest)return;
        field('map').disabled=false;
        if(data.error){mapRate.textContent='Map ranking unavailable.';return;}
        maps=data.maps;filterMaps();return;
      }
      if(data.type==='map'){if(data.request!==request)return;kills=data.error||data.kills===null?'':data.kills;mapRate.textContent=kills===''?(field('mode').value==='auto'?'Automatic estimate unavailable for this map. Use measured clear time.':'Enter an observed full-map clear time to compare maps.'):`${data.mode==='auto'?`Automatic baseline: ${Number(data.clear?.seconds).toLocaleString('en-US',{maximumFractionDigits:2})} seconds per full clear (${Number(data.clear?.combatSeconds).toLocaleString('en-US',{maximumFractionDigits:2})} attacking + ${Number(data.clear?.travelSeconds).toLocaleString('en-US',{maximumFractionDigits:2})} travel).`:'Full-clear scenario:'} ${Math.round(kills).toLocaleString()} kills/hour - normal monsters`;paint();return;}

      clearTimeout(timeTimer);if(data.error){fail();return;}characters=(data.characters||[]).filter(c=>c.eligible);if(!characters.length){fail();source.textContent='A saved Beast Master or Wind Walker is required for active shiny farming.';return;}

      field('character').innerHTML=characters.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join('');

      maps=data.maps||[];
      field('map').innerHTML=(data.maps||[]).map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');

      if((data.maps||[]).some(m=>m.id===Number(characters[0].map)))field('map').value=characters[0].map;

      if(!manual)selectCharacter();else rankMaps();};

    worker.postMessage(raw);

  }

  function plan(groups){

    const pets=groups.flatMap(g=>(g.pets||[]).map(p=>({...p,bonusId:g.bonusId,tier:tier(g.bonusId)})));

    const cap=p=>p.maxLevel===30?30:20;

    const eligible=p=>p.level!==null&&p.level<cap(p)&&(p.unlocked===true||p.level>0);

    const stages=[{name:'Shiny speed → Lv 5',target:5,accept:p=>p.bonusId===16},{name:'Every available shiny → Lv 2',target:2,accept:()=>true},{name:'Shiny speed → Lv 10',target:10,accept:p=>p.bonusId===16},...[5,10,15,20,...(pets.some(p=>p.maxLevel===30)?Array.from({length:10},(_,i)=>21+i):[])].map(target=>({name:'All available shinies → Lv '+target,target,accept:()=>true}))];

    const stage=stages.find(s=>pets.some(p=>eligible(p)&&s.accept(p)&&p.level<s.target));

    const ranked=pets.map(p=>({...p,target:stage&&eligible(p)&&stage.accept(p)&&p.level<stage.target?Math.min(cap(p),stage.target):null,ready:!!stage&&eligible(p)&&stage.accept(p)&&p.level<stage.target})).sort((a,b)=>Number(b.ready)-Number(a.ready)||a.tier-b.tier||tiers[a.tier].ids.indexOf(a.bonusId)-tiers[b.tier].ids.indexOf(b.bonusId)||(a.level??99)-(b.level??99)||a.world-b.world||a.order-b.order);

    return {pets:ranked,stage,next:ranked.find(p=>p.ready)};

  }

  function render(host,groups,raw){

    const model=plan(groups),maxLevel=model.pets.some(p=>p.maxLevel===30)?30:20,overLevels=model.pets.reduce((n,p)=>n+Math.max(0,(p.level??0)-20),0),name=p=>String(root.WORLD4_CATALOG?.MonsterNames?.[p.id]||p.id).replaceAll('_',' ');

    let query='',filter='all';

    host.innerHTML=`<section class="shiny-planner"><header class="section-head compact"><div><p class="eyebrow">World 4 · Breeding</p><h2>Shiny pet leveling plan</h2><p>Build shiny speed, then rotate through the bonuses your account needs.</p><p>${maxLevel===30?`Menagerie unlocked: shiny level cap 30. ${overLevels} total levels above 20 give ${(1+overLevels/10).toLocaleString('en-US',{maximumFractionDigits:1})}× shiny leveling speed.`:'Shiny level cap: 20. Buy the +10 Max Shiny LV unlock in the Menagerie to raise it to 30.'}</p></div></header><details class="shiny-guide shiny-combined"><summary>Current combined bonuses</summary><div class="shiny-bonus-grid">${groups.map(g=>`<p>${esc(g.effect)} <small>(${esc(g.level)})</small></p>`).join('')}</div></details><details class="shiny-guide"><summary>How to speed up shinies with Wind Walker + VMan</summary><ol><li>Unlock shiny breeding with <strong>Paint Bucket</strong>. Hatch shiny pets and place them in the <strong>Fenceyard</strong>; stored pets do not gain Fenceyard time.</li><li>On Voidwalker, get <strong>Enhancement Eclipse to level 150</strong> on the preset you use. This enhances Beast Master’s <strong>Whale Wallop</strong>, inherited by Wind Walker.</li><li>On Beast Master / Wind Walker, learn Whale Wallop and use an active combat setup. The enhancement gives kills a <strong>50% chance to advance incubator time by 3 seconds</strong> and also advances Fenceyard progress. It is a kill effect, not three seconds awarded per whale cast.</li><li>Play Wind Walker actively on a map you clear quickly. Use your respawn and combat talents to sustain kills. Compare actual active kill speed; the offline AFK estimate is not this effect’s trigger rate.</li><li>Stack shiny copies of your chosen species in the Fenceyard to focus progress. When you reach the target, rotate to the next species. Earned shiny bonuses persist after moving pets out.</li></ol><p>Start with shiny-speed pets to Lv 5, bring available shinies to Lv 2, then shiny-speed pets to Lv 10. Continue in tier order through Lv 5, 10, 15 and 20; After the Menagerie unlock, rotate through one-level milestones from 21 to 30. Bring available pets to each milestone before pushing the next, using bonus tiers within each rotation. The Menagerie unlock raises the cap to 30. Grand Martial of Shinytown also improves shiny leveling. Each shiny level above 20 adds 10% to a shared shiny-speed multiplier, so all pets can help speed up later leveling.</p><small>The guide is general setup advice; your talent preset and active kill rate are not verified here.</small></details><details class="shiny-guide"><summary>Tier order · first to last</summary>${tiers.map(t=>`<p><strong>${t.name}</strong><br>${t.why}</p>`).join('')}<p>This is a general progression ranking, not a calculated best return for every account. Within a bonus, lower levels come first. Locked pets stay in the reference list.</p></details><div class="arcade-page-controls"><input type="search" aria-label="Search shiny pets" placeholder="Search pets or bonuses…"><select aria-label="Shiny pet filter"><option value="all">All pets · tier order</option><option value="ready">Current milestone queue</option><option value="unleveled">No shiny levels yet</option></select><span class="shiny-count"></span></div><div class="shiny-list"></div></section>`;

    function paint(){

      const shown=model.pets.filter(p=>(filter==='all'||filter==='ready'&&p.ready||filter==='unleveled'&&p.level===0)&&`${name(p)} ${p.perLevel}`.toLowerCase().includes(query));

      host.querySelector('.shiny-count').textContent=shown.length+' pets';

      host.querySelector('.shiny-list').innerHTML=shown.map(p=>`<article class="shiny-pet ${p.ready?'shiny-ready':''}"><img src="${esc(p.icon)}" alt="" loading="lazy"><div><small>${esc(tiers[p.tier].name)} · W${p.world}</small><h3>${esc(name(p))}</h3><p>${esc(p.bonus)}</p><small>Per level: ${esc(p.perLevel)}</small></div><div class="shiny-target"><strong>${p.level===null?'Unknown':`Lv ${p.level}`}</strong><span>${p.ready?`Next target: Lv ${p.target}`:p.level>=(p.maxLevel||20)?'Complete':p.unlocked===false&&!(p.level>0)?'Species locked':p.level===null?'Missing record':p.level===0?'Hatch shiny':'Later milestone'}</span></div></article>`).join('')||'<p>No pets match this view.</p>';

    }

    host.querySelector('[aria-label="Search shiny pets"]').oninput=e=>{query=e.target.value.trim().toLowerCase();paint();};

    host.querySelector('[aria-label="Shiny pet filter"]').onchange=e=>{filter=e.target.value;paint();};paint();

    const timing=document.createElement('section');timing.className='shiny-guide shiny-time';host.querySelector('.shiny-combined').after(timing);mountTime(timing,model,raw,name);

  }

  const api={plan,render,tiers,estimate,estimateLineup};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ShinyPlanner=api;

})(typeof window!=='undefined'?window:globalThis);
