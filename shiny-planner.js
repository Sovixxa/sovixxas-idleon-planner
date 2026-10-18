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

  const duration=seconds=>seconds===null?'Enter full-map clear time':seconds===0?'Target reached':seconds<1?'<1 second':seconds<3600?`${Math.ceil(seconds/60).toLocaleString()} min`:seconds<86400?`${(seconds/3600).toLocaleString('en-US',{maximumFractionDigits:1})} hours`:`${(seconds/86400).toLocaleString('en-US',{maximumFractionDigits:1})} days`;

  let timeWorker,timeTimer;

  function mountTime(host,model,raw,name){

    timeWorker?.terminate();clearTimeout(timeTimer);

    const pets=model.pets;if(!pets.length)return;

    host.innerHTML=`<h3>Shiny leveling time</h3><p>Compare passive Fenceyard progress while AFK with active Beast Master / Wind Walker farming.</p><div class="shiny-time-fields"><label>Pet<select data-time="pet" aria-label="Timing pet">${pets.map((p,i)=>`<option value="${i}">${esc(name(p))} · ${p.level===null?'Unknown':`Lv ${p.level}`}</option>`).join('')}</select></label><label>Target level<input data-time="target" aria-label="Target shiny level" type="number" min="1" step="1"></label><label>Shiny copies in Fenceyard<input data-time="copies" aria-label="Shiny copies" type="number" min="0" max="27" step="1"></label><label>Character bonus setup<select data-time="character" aria-label="Shiny timing character"><option>Loading saved bonuses…</option></select></label><label>Shiny speed multiplier (×)<input data-time="speed" aria-label="Shiny speed multiplier" type="number" min="0" step="any" placeholder="Loading…"></label><label>Full-map clear time (seconds)<input data-time="clear" aria-label="Full-map clear time" type="number" min="0.1" step="any" placeholder="Enter observed clear time"></label><label>Map<select data-time="map" aria-label="Shiny farming map"><option>Loading maps...</option></select></label></div><label class="shiny-time-enhanced"><input data-time="uwu" type="checkbox"> Compare while UWU Rawrrr is active</label><label class="shiny-time-enhanced"><input data-time="enhanced" type="checkbox"> Enhanced Whale Wallop is enabled on the active character</label><p class="shiny-time-source"></p><div class="shiny-time-results" aria-live="polite"></div><small>Active adds an average 1.5 seconds of Fenceyard time per actual kill (50% × 3 seconds), on top of passive time. Requires Whale Wallop and Enhancement Eclipse Lv 150; confirm the checkbox for your active setup. Map order compares normal-monster farming with the same full-map clear time on every map. Enter the seconds needed to kill a full spawn, excluding the respawn wait. This assumes you can clear every monster; harder maps and layouts may need more time. UWU compares buff-active conditions only, not average uptime. Special spawns and multikill are excluded. Estimates hold the selected speed and copies fixed; future shiny-speed and OverLV gains can shorten the time. Reimport after leveling. These are elapsed durations, not a countdown.</small>`;

    const field=k=>host.querySelector(`[data-time="${k}"]`),results=host.querySelector('.shiny-time-results'),source=host.querySelector('.shiny-time-source');

    let manual=false,characters=[],kills='',request=0,rankRequest=0;

    const mapRate=document.createElement('p');mapRate.className='shiny-time-source';source.after(mapRate);

    const selectMap=()=>{kills='';paint();if(!timeWorker||!characters.length)return;mapRate.textContent='Estimating active kills on this map...';timeWorker.postMessage({type:'map',character:characters[Number(field('character').value)].index,clearSeconds:field('clear').value,uwu:field('uwu').checked,map:Number(field('map').value),request:++request});};

    const rankMaps=()=>{++request;field('map').disabled=true;mapRate.textContent='Ranking maps from best to worst...';kills='';paint();timeWorker.postMessage({type:'rank',character:characters[Number(field('character').value)].index,clearSeconds:field('clear').value,uwu:field('uwu').checked,request:++rankRequest});};
    const paint=()=>{const p=pets[Number(field('pet').value)],r=estimate(p,Number(field('target').value),field('copies').value,field('speed').value,kills,field('enhanced').checked);results.innerHTML=r.error?`<p>${esc(r.error)}</p>`:`<article><span>AFK / passive</span><strong>${duration(r.passive)}</strong></article><article><span>Active · ${r.active===null?'rate needed':`${r.boost.toLocaleString('en-US',{maximumFractionDigits:2})}× speed`}</span><strong>${duration(r.active)}</strong></article>`;};

    const selectPet=()=>{const p=pets[Number(field('pet').value)];field('target').max=p.maxLevel||20;field('target').value=p.target||Math.min(p.maxLevel||20,(p.level||0)+1);field('copies').value=p.copies??'';paint();};

    field('pet').onchange=selectPet;

    for(const k of ['target','copies','enhanced'])field(k).oninput=paint;

    field('speed').oninput=()=>{manual=true;source.textContent='Using your manual shiny speed multiplier.';paint();};

    const selectCharacter=()=>{const c=characters[Number(field('character').value)];if(!c||!numeric(c.rate)||c.rate<=0)return;field('speed').value=c.rate;source.textContent=`Saved bonuses for ${c.name}, including the saved OverLV multiplier. Adjust the multiplier if your in-game setup differs.`;manual=false;rankMaps();};

    field('character').onchange=selectCharacter;field('map').onchange=selectMap;field('clear').oninput=()=>{if(characters.length)rankMaps();};field('uwu').onchange=()=>{if(characters.length)rankMaps();};selectPet();

    if(!raw){field('map').innerHTML='<option>Map estimate unavailable</option>';field('character').innerHTML='<option>Manual setup</option>';field('speed').placeholder='Enter in-game multiplier';return;}

    const worker=timeWorker=new Worker('shiny-time-worker.js');

    const finish=()=>{worker.terminate();if(timeWorker===worker){timeWorker=null;clearTimeout(timeTimer);}};

    const fail=()=>{finish();if(!host.isConnected)return;field('map').innerHTML='<option>Map estimate unavailable</option>';field('character').innerHTML='<option>Manual setup</option>';field('speed').placeholder='Enter in-game multiplier';if(!manual)source.textContent='Saved speed unavailable. Enter your in-game shiny speed multiplier.';};

    worker.onerror=fail;timeTimer=setTimeout(fail,60000);

    worker.onmessage=e=>{if(!host.isConnected){finish();return;}const data=e.data;

      if(data.type==='rank'){
        if(data.request!==rankRequest)return;
        field('map').disabled=false;
        if(data.error){mapRate.textContent='Map ranking unavailable.';return;}
        const selected=field('map').value;
        field('map').innerHTML=data.maps.map((m,i)=>`<option value="${m.id}">${i+1}. ${esc(m.name)} - ${m.kills===null?'Clear time needed':Math.round(m.kills).toLocaleString()+' kills/hr'}</option>`).join('');
        if(data.maps.some(m=>String(m.id)===selected))field('map').value=selected;
        selectMap();return;
      }
      if(data.type==='map'){if(data.request!==request)return;kills=data.error||data.kills===null?'':data.kills;mapRate.textContent=kills===''?'Enter an observed full-map clear time to compare maps.':`Full-clear scenario: ${Math.round(kills).toLocaleString()} kills/hour - normal monsters`;paint();return;}

      clearTimeout(timeTimer);if(data.error){fail();return;}characters=(data.characters||[]).filter(c=>c.eligible);if(!characters.length){fail();source.textContent='A saved Beast Master or Wind Walker is required for active shiny farming.';return;}

      field('character').innerHTML=characters.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join('');

      field('map').innerHTML=(data.maps||[]).map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');

      if((data.maps||[]).some(m=>m.id===Number(characters[0].map)))field('map').value=characters[0].map;

      if(!manual)selectCharacter();else rankMaps();};

    worker.postMessage(raw);

  }

  function plan(groups){

    const pets=groups.flatMap(g=>(g.pets||[]).map(p=>({...p,bonusId:g.bonusId,tier:tier(g.bonusId)})));

    const cap=p=>p.maxLevel===30?30:20;

    const eligible=p=>p.level!==null&&p.level<cap(p)&&(p.unlocked===true||p.level>0);

    const stages=[{name:'Shiny speed → Lv 5',target:5,accept:p=>p.bonusId===16},{name:'Every available shiny → Lv 2',target:2,accept:()=>true},{name:'Shiny speed → Lv 10',target:10,accept:p=>p.bonusId===16},...[5,10,15,20,...(pets.some(p=>p.maxLevel===30)?[25,30]:[])].map(target=>({name:'All available shinies → Lv '+target,target,accept:()=>true}))];

    const stage=stages.find(s=>pets.some(p=>eligible(p)&&s.accept(p)&&p.level<s.target));

    const ranked=pets.map(p=>({...p,target:stage&&stage.accept(p)?stage.target:null,ready:!!stage&&eligible(p)&&stage.accept(p)&&p.level<stage.target})).sort((a,b)=>Number(b.ready)-Number(a.ready)||a.tier-b.tier||tiers[a.tier].ids.indexOf(a.bonusId)-tiers[b.tier].ids.indexOf(b.bonusId)||(a.level??99)-(b.level??99)||a.world-b.world||a.order-b.order);

    return {pets:ranked,stage,next:ranked.find(p=>p.ready)};

  }

  function render(host,groups,raw){

    const model=plan(groups),maxLevel=model.pets.some(p=>p.maxLevel===30)?30:20,overLevels=model.pets.reduce((n,p)=>n+Math.max(0,(p.level??0)-20),0),complete=model.pets.length>0&&model.pets.every(p=>p.level!==null&&p.level>=(p.maxLevel||20)),name=p=>String(root.WORLD4_CATALOG?.MonsterNames?.[p.id]||p.id).replaceAll('_',' ');

    let query='',filter='all';

    host.innerHTML=`<section class="shiny-planner"><header class="section-head compact"><div><p class="eyebrow">World 4 · Breeding</p><h2>Shiny pet leveling plan</h2><p>Build shiny speed, then rotate through the bonuses your account needs.</p><p>${maxLevel===30?`Menagerie unlocked: shiny level cap 30. ${overLevels} total levels above 20 give ${(1+overLevels/10).toLocaleString('en-US',{maximumFractionDigits:1})}× shiny leveling speed.`:'Shiny level cap: 20. Buy the +10 Max Shiny LV unlock in the Menagerie to raise it to 30.'}</p></div></header><details class="shiny-guide shiny-combined" open><summary>Current combined bonuses</summary><div class="shiny-bonus-grid">${groups.map(g=>`<p>${esc(g.effect)} <small>(${esc(g.level)})</small></p>`).join('')}</div></details><section class="shiny-next"><span class="eyebrow">${esc(model.stage?.name||'Saved progress')}</span><h3>${model.next?`${esc(name(model.next))} → Lv ${model.next.target}`:complete?`All shiny pets are Lv ${maxLevel}`:'No available target found'}</h3><p>${model.next?`${model.next.level===0?'Hatch a shiny first, then place it':'Place shiny copies'} in the Fenceyard. Current level: ${model.next.level}. Bonus per level: ${esc(model.next.perLevel)}.`:complete?'All listed shinies have reached the modeled maximum. Use the tier list below as a reference.':'Load complete breeding records to see targets. Locked species must be unlocked before leveling.'}</p></section><details class="shiny-guide"><summary>How to speed up shinies with Wind Walker + VMan</summary><ol><li>Unlock shiny breeding with <strong>Paint Bucket</strong>. Hatch shiny pets and place them in the <strong>Fenceyard</strong>; stored pets do not gain Fenceyard time.</li><li>On Voidwalker, get <strong>Enhancement Eclipse to level 150</strong> on the preset you use. This enhances Beast Master’s <strong>Whale Wallop</strong>, inherited by Wind Walker.</li><li>On Beast Master / Wind Walker, learn Whale Wallop and use an active combat setup. The enhancement gives kills a <strong>50% chance to advance incubator time by 3 seconds</strong> and also advances Fenceyard progress. It is a kill effect, not three seconds awarded per whale cast.</li><li>Play Wind Walker actively on a map you clear quickly. Use your respawn and combat talents to sustain kills. Compare actual active kill speed; the offline AFK estimate is not this effect’s trigger rate.</li><li>Stack shiny copies of your chosen species in the Fenceyard to focus progress. When you reach the target, rotate to the next species. Earned shiny bonuses persist after moving pets out.</li></ol><p>Start with shiny-speed pets to Lv 5, bring available shinies to Lv 2, then shiny-speed pets to Lv 10. Continue in tier order through Lv 5, 10, 15 and 20; Menagerie extends the plan to 25 and 30. The Menagerie unlock raises the cap to 30. Grand Martial of Shinytown also improves shiny leveling. Each shiny level above 20 adds 10% to a shared shiny-speed multiplier, so all pets can help speed up later leveling.</p><small>The guide is general setup advice; your talent preset and active kill rate are not verified here.</small></details><details class="shiny-guide"><summary>Tier order · first to last</summary>${tiers.map(t=>`<p><strong>${t.name}</strong><br>${t.why}</p>`).join('')}<p>This is a general progression ranking, not a calculated best return for every account. Within a bonus, lower levels come first. Locked pets stay in the reference list.</p></details><div class="arcade-page-controls"><input type="search" aria-label="Search shiny pets" placeholder="Search pets or bonuses…"><select aria-label="Shiny pet filter"><option value="all">All pets · tier order</option><option value="ready">Current milestone queue</option><option value="unleveled">No shiny levels yet</option></select><span class="shiny-count"></span></div><div class="shiny-list"></div></section>`;

    function paint(){

      const shown=model.pets.filter(p=>(filter==='all'||filter==='ready'&&p.ready||filter==='unleveled'&&p.level===0)&&`${name(p)} ${p.perLevel}`.toLowerCase().includes(query));

      host.querySelector('.shiny-count').textContent=shown.length+' pets';

      host.querySelector('.shiny-list').innerHTML=shown.map(p=>`<article class="shiny-pet ${p.ready?'shiny-ready':''}"><img src="${esc(p.icon)}" alt="" loading="lazy"><div><small>${esc(tiers[p.tier].name)} · W${p.world}</small><h3>${esc(name(p))}</h3><p>${esc(p.bonus)}</p><small>Per level: ${esc(p.perLevel)}</small></div><div class="shiny-target"><strong>${p.level===null?'Unknown':`Lv ${p.level}`}</strong><span>${p.ready?`Next target: Lv ${p.target}`:p.level>=(p.maxLevel||20)?'Complete':p.unlocked===false&&!(p.level>0)?'Species locked':p.level===null?'Missing record':p.level===0?'Hatch shiny':'Later milestone'}</span></div></article>`).join('')||'<p>No pets match this view.</p>';

    }

    host.querySelector('[aria-label="Search shiny pets"]').oninput=e=>{query=e.target.value.trim().toLowerCase();paint();};

    host.querySelector('[aria-label="Shiny pet filter"]').onchange=e=>{filter=e.target.value;paint();};paint();

    const timing=document.createElement('section');timing.className='shiny-guide shiny-time';host.querySelector('.shiny-next').after(timing);mountTime(timing,model,raw,name);

  }

  const api={plan,render,tiers,estimate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ShinyPlanner=api;

})(typeof window!=='undefined'?window:globalThis);
