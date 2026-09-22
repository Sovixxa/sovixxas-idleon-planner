(function(root){
  'use strict';
  const parse=v=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{return null;}}return v;};
  const map=v=>{v=parse(v);return v?.h||v||{};};
  const number=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
  const n=v=>number(v)??0;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pretty=v=>String(v??'').replaceAll('_',' ').replaceAll('@',' ');
  const fmt=v=>v===null?'—':!Number.isFinite(v)?'Too large':Math.abs(v)>=1e6?v.toExponential(2):v.toLocaleString(undefined,{maximumFractionDigits:1});
  function duration(h){if(h===null)return 'Set speed';if(h===0)return 'Ready';if(!Number.isFinite(h))return 'Too long';if(h<1/60)return '<1 min';if(h<1)return Math.ceil(h*60)+' min';if(h<24)return fmt(h)+' hr';if(h<8760)return fmt(h/24)+' days';return fmt(h/8760)+' years';}
  // Verified against the installed client: CookingR, EmporiumBonus and the daily NMLB loop.
  function decode(data,rawRoot={}){
    const meals=parse(data.Meals),ninja=parse(data.Ninja),sailing=parse(data.Sailing),spelunk=parse(data.Spelunk),grim=parse(data.Grimoire);
    const owned=ninja?.[102]?.[9],has=id=>typeof owned==='string'?owned.includes('_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'[id]):false;
    const bundle=map(data.BundlesReceived),jade=has(16),paid=n(bundle.bun_s)===1;
    const capParts=[['Base',30],['Causticolumn',10*Math.min(6,Math.max(0,n(sailing?.[3]?.[17])))],['Jade Emporium',10*Number(has(20))+10*Number(has(21))],['Spelunking lore',n(spelunk?.[0]?.[5])>=1?30:0],['Grimoire',Math.min(20,Math.max(0,n(grim?.[26])))]];
    const cap=capParts.reduce((sum,p)=>sum+p[1],0),levels=Array.isArray(meals?.[0])?meals[0].map(number):[];
    const capKnown=!!(sailing&&ninja&&spelunk&&grim)&&!levels.some(v=>v>cap);
    const options=parse(data.OptionsListAccount??data.OptLacc??rawRoot.OptionsListAccount??rawRoot.OptLacc),dream=parse(data.Dream),weekly=map(data.WeeklyBoss),ach=parse(data.AchieveReg);
    const comp=map(rawRoot.companion),borrowed=String(options?.[606]??'').split(',').includes('162');
    let companion=0;
    for(const row of comp.l||[]){const a=String(row).split(',');if(n(a[0])===162)companion=Math.max(companion,n(a[4])===1?1.6:1);}
    if(borrowed)companion=1;
    const reduction=Math.max(.001,Math.pow(n(weekly.d_33)===-1?.58:.8,Math.min(n(options?.[193]),n(dream?.[11]))));
    return {levels,stock:Array.isArray(meals?.[2])?meals[2].map(number):[],progress:Array.isArray(meals?.[1])?meals[1].map(number):[],cap,capKnown,capParts,jade,paid,gain:Number(jade)+2*Number(paid),nmlbKnown:typeof owned==='string'&&parse(data.BundlesReceived)!=null,companion,companionKnown:Array.isArray(comp.l)||borrowed,discount:reduction/(n(ach?.[233])===-1?1.1:1),discountKnown:!!(options&&dream&&parse(data.WeeklyBoss)&&ach)};
  }
  function cost(level,discount=1,companion=0){
    if(level===null)return null;
    const tier=Math.floor((level+1000)/1111);
    return Math.max(.001,1/Math.max(1,5*companion))*discount*Math.pow(10,22*tier)*(10+level+level*level)*Math.pow(1.2+.05*level,level)*Math.pow(1+.4*tier,level);
  }
  function forecast(levels,cap,gain,days=14){
    const copy=levels.slice(),out=[];if(!(gain>0&&cap>0))return out;
    for(let day=1;day<=days;day++){
      let id=-1,lowest=999;
      copy.forEach((v,i)=>{if(v!==null&&v>=2&&v<=lowest&&v<cap){id=i;lowest=v;}});
      if(id<0)break;
      const after=Math.min(cap,lowest+gain);out.push({day,id,before:lowest,after});copy[id]=after;
    }return out;
  }
  function estimate({level,stock,progress,requirement,discount,companion,speed,ladleBonus}){
    const needed=cost(level,discount,companion);
    if(needed===null||stock===null||progress===null)return {needed,remaining:null,hours:null,ladles:null};
    const remaining=Math.max(0,Math.ceil(needed)-stock);
    const work=Math.max(0,remaining*requirement-progress);
    const hours=work===0?0:speed>0?work/speed:null;
    return {needed,remaining,hours,ladles:hours===null?null:Math.ceil(hours/(1+ladleBonus/100))};
  }
  // Rate inputs stay with this save object during navigation; never leak to another imported account.
  const settings=new WeakMap();
  function render(host,data,rawRoot={}){
    const model=decode(data,rawRoot),catalog=root.WORLD4_CATALOG.MealINFO;
    let config=settings.get(data);if(!config){config={speed:'',ladleBonus:0,companion:model.companion,cap:model.cap};settings.set(data,config);}
    let tab='Meals',page=0,setup=false,mealFilter='all',query='';
    const estimates=()=>catalog.map((r,id)=>estimate({level:model.levels[id]??null,stock:model.stock[id]??null,progress:model.progress[id]??null,requirement:Number(r[1]),discount:model.discount,companion:config.companion,speed:number(config.speed),ladleBonus:config.ladleBonus}));
    function paint(){
      const rows=estimates(),days=forecast(model.levels.slice(0,catalog.length),config.cap,model.gain),next=days[0],capConfirmed=model.capKnown||config.capConfirmed;
      host.innerHTML=`<div class="section-head compact"><div><p class="eyebrow">World 4</p><h2>Cooking</h2></div><span class="muted">${model.levels.slice(0,catalog.length).filter(v=>v>0).length}/${catalog.length} meals · Cap ${config.cap}${capConfirmed?'':' (check)'}</span></div>
        <div class="cook-toolbar"><div class="cook-tabs" role="tablist" aria-label="Cooking sections">${['Meals','NMLB'].map(t=>`<button role="tab" aria-selected="${tab===t}" data-cook-tab="${t}">${t}</button>`).join('')}</div><button id="cookSetup">${setup?'Hide settings':'Estimate settings'}</button></div>
        ${setup?`<form id="cookSettings" class="cook-settings"><label>Combined cooking speed / hr<input name="speed" aria-label="Combined cooking speed per hour" inputmode="decimal" placeholder="e.g. 1.5e30" value="${esc(config.speed)}"></label><label>Overflowing Ladle bonus %<input name="bonus" aria-label="Overflowing Ladle bonus percent" type="number" min="0" max="100" step="any" value="${config.ladleBonus}"></label><label>Meal cost companion<select name="companion"><option value="0" ${config.companion===0?'selected':''}>None / F2P baseline</option><option value="1" ${config.companion===1?'selected':''}>5× cheaper</option><option value="1.6" ${config.companion===1.6?'selected':''}>8× cheaper (upgraded)</option></select></label><label>Meal level cap<input name="cap" aria-label="Meal level cap" type="number" min="30" max="200" value="${config.cap}"></label><button type="submit">Apply</button><p>Add the cooking speeds shown on the kitchens you plan to use. Estimates assume those kitchens all cook the selected meal, with unchanged speed. Enter the bonus shown on the character using your ladles. These settings only affect this planner.</p><p id="cookError" role="alert"></p></form>`:''}
        <section role="tabpanel" aria-label="${tab}">${tab==='Meals'?`
          <p class="cook-note">Next level · ${number(config.speed)>0?'Projected time / ladles using your entered speed':'Set cooking speed in Estimate settings to calculate time and ladles.'}${model.companionKnown?'':' · Companion data missing: F2P costs assumed.'}${model.discountKnown?'':' · Discount data incomplete: costs are estimates.'}</p>
          <div class="arcade-page-controls"><input id="cookSearch" type="search" aria-label="Search meals" placeholder="Search meals…" value="${esc(query)}"><select id="cookFilter" aria-label="Meal status"><option value="all">All meals</option><option value="progress">Needs levels</option><option value="missing">Undiscovered</option><option value="maxed">Maxed out</option></select><span>${model.levels.filter(lv=>capConfirmed&&lv>=config.cap).length} maxed meals</span></div><div class="cook-grid">${catalog.map((r,id)=>({r,id})).filter(({r,id})=>pretty(r[0]).toLowerCase().includes(query)&&(mealFilter==='all'||mealFilter==='missing'&&model.levels[id]===0||mealFilter==='maxed'&&capConfirmed&&model.levels[id]>=config.cap||mealFilter==='progress'&&model.levels[id]>0&&model.levels[id]<config.cap)).map(({r,id})=>{const lv=model.levels[id]??null,e=rows[id],max=capConfirmed&&lv>=config.cap,locked=lv===0;
            return `<button class="cook-meal ${max?'cook-max':''}" data-meal="${id}" title="${esc(pretty(r[0]))} — ${max?'Max level':locked?'Discover this recipe first':`Next level needs ${fmt(e.remaining)} more meals. ${duration(e.hours)}; ${fmt(e.ladles)} ladles.`}"><img src="assets/CookingM${id}.png" alt=""><span class="cook-name">${esc(pretty(r[0]))}</span><strong>${lv===null?'No save':max?'MAX · '+lv:'Lv '+lv}</strong><progress max="${config.cap}" value="${lv||0}" aria-label="Meal level progress"></progress><small>${max?'Fully leveled':locked?'Undiscovered':e.remaining===null?'Stock unavailable':fmt(e.remaining)+' meals left'}</small><span class="cook-metrics">${max||locked?'—':`<span>◷ ${duration(e.hours)}</span><span>${e.ladles===null?'—':fmt(e.ladles)} ladles</span>`}</span></button>`;}).join('')}</div>`:
          `<div class="cook-nmlb-head"><div><h3>No Meal Left Behind</h3><p>${!model.nmlbKnown?'NMLB unlock data is incomplete. Import a full export.':model.gain?`+${model.gain} levels to one meal per daily trigger`:'Locked — unlock No Meal Left Behind in the Jade Emporium.'}</p><small>Jade upgrade: ${model.jade?'owned (+1)':'not owned'} · Paid bundle: ${model.paid?'owned (+2)':'not owned'}</small></div><div><b>${capConfirmed?'Account cap':'Estimated cap'}: ${config.cap}</b><small>${model.capParts.filter(p=>p[1]).map(p=>p[0]+' +'+p[1]).join(' · ')}</small></div></div>
          <p class="cook-note">Requires Lv 2+. Ties choose the later meal. Forecast assumes you play each day and make no other meal upgrades. Dates depend on your in-game daily reset.</p>
          ${!capConfirmed?'<p class="cook-note">Cap data is incomplete. Confirm your in-game cap in Estimate settings to enable the forecast.</p>':!model.nmlbKnown?'':next?`<div class="cook-next"><img src="assets/CookingM${next.id}.png" alt=""><div><small>NEXT DAILY TRIGGER</small><h3>${esc(pretty(catalog[next.id][0]))}</h3></div><strong>Lv ${next.before} → ${next.after}</strong></div><div class="cook-forecast">${days.map(d=>`<button data-meal="${d.id}"><span>Day ${d.day}</span><img src="assets/CookingM${d.id}.png" alt=""><span>${esc(pretty(catalog[d.id][0]))}</span><strong>${d.before} → ${d.after}</strong></button>`).join('')}</div>`:model.gain?'<p>No eligible meals. Meals must be level 2 or higher and below your cap.</p>':''}`}</section><section id="cookDetail" class="w4-detail" hidden aria-label="Meal details"></section>`;
      host.querySelectorAll('[data-cook-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.cookTab;paint();});
      const search=host.querySelector('#cookSearch');if(search)search.oninput=()=>{const pos=search.selectionStart;query=search.value.toLowerCase();paint();const next=host.querySelector('#cookSearch');next.focus();try{next.setSelectionRange(pos,pos);}catch{}};const filter=host.querySelector('#cookFilter');if(filter){filter.value=mealFilter;filter.onchange=()=>{mealFilter=filter.value;paint();};}
      host.querySelector('#cookSetup').onclick=()=>{setup=!setup;paint();};
      host.querySelector('#cookPrev')?.addEventListener('click',()=>{page=0;paint();});host.querySelector('#cookNext')?.addEventListener('click',()=>{page=1;paint();});
      host.querySelector('#cookSettings')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target),speed=String(f.get('speed')).trim(),bonus=Number(f.get('bonus')),cap=Number(f.get('cap'));
        if((speed!==''&&!(Number.isFinite(Number(speed))&&Number(speed)>0))||!Number.isFinite(bonus)||bonus<0||bonus>100||!Number.isInteger(cap)||cap<30||cap>200||model.levels.some(v=>v>cap)){host.querySelector('#cookError').textContent='Enter a positive speed (scientific notation works), 0–100% ladle bonus, and a cap at least as high as your saved meals.';return;}
        Object.assign(config,{speed,ladleBonus:bonus,cap,companion:Number(f.get('companion')),capConfirmed:true});setup=false;paint();});
      host.querySelectorAll('[data-meal]').forEach(b=>b.onclick=()=>{const id=Number(b.dataset.meal),r=catalog[id],e=rows[id],lv=model.levels[id]??null,panel=host.querySelector('#cookDetail');panel.hidden=false;panel.innerHTML=`<button id="cookClose" aria-label="Close meal details">Close</button><h3>${esc(pretty(r[0]))}</h3><p>Level ${lv??'?'} / ${config.cap}</p><p>${esc(pretty(r[3]).replace('{',fmt(n(r[2])*n(lv))))} <small>(base effect; account multipliers excluded)</small></p><p>Stock: ${fmt(model.stock[id]??null)} · Next-level cost: ${fmt(e.needed)}</p><p>Still needed: ${fmt(e.remaining)} meals</p><p>Estimated time: ${duration(e.hours)} · Ladles: ${fmt(e.ladles)}</p><p>One ladle advances every kitchen by ${fmt(1+config.ladleBonus/100)} hours. Estimates apply your entered combined speed to this meal alone; they exclude future speed changes and free NMLB levels.</p><p>${esc(pretty(r[4]))}</p>`;host.querySelector('#cookClose').onclick=()=>{panel.hidden=true;};});
    }paint();
  }
  const api={decode,cost,forecast,estimate,duration,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Cooking=api;
})(typeof window!=='undefined'?window:globalThis);
