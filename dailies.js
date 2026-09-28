(function(root){
  'use strict';
  const M=typeof module!=='undefined'&&module.exports?require('./dailies-model'):root.DailiesModel;
  const KEY='idleon-dailies-v1',object=x=>x&&typeof x==='object'&&!Array.isArray(x);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const WORLDS=['','Blunder Hills','Yum-Yum Desert','Frostbite Tundra','Hyperion Nebula','Smolderin’ Plateau','Spirited Valley','World 7'];
  const ICONS={research:'Research',vials:'Alchemy',alchemy:'Alchemy',construction:'Construction',sailing:'Sailing',gaming:'Gaming',farming:'Farming',spelunking:'Spelunking',worship:'Worship',lab:'Lab',killroy:'Killroy',tasks:'Tasks',breeding:'Breeding',cooking:'Cooking',sneaking:'Sneaking',summoning:'Summoning',compass:'Compass'};
  Object.assign(ICONS,{guilds:'Guilds',quests:'Tasks',divinity:'Divinity',dungeons:'Dungeons',events:'Events',characters:'Characters',tome:'Tome',prayers:'Prayers',votes:'Votes',hole:'Hole'});
  function classify(row){return row.autoHidden||row.ready===false?'settled':row.ready===true?'ready':'unknown';}
  function render(host,raw){
    clearInterval(render.timer);
    const rows=M.model(raw),account=M.accountKey(raw);
    let saved={},storageError=false;
    try{saved=JSON.parse(root.localStorage.getItem(KEY))||{};}catch{storageError=true;}
    if(!object(saved))saved={};
    const state=Object.hasOwn(saved,account)&&object(saved[account])?saved[account]:{};
    if(!object(state.hidden))state.hidden={};
    // Old checklist marks are retained in storage, but no longer suppress save-based alerts.
    const prefs=object(state.dashboard)?state.dashboard:{};
    let tab=['overview','daily','weekly','timers','unknown','settled','hidden'].includes(prefs.tab)?prefs.tab:'overview';
    let world=/^[1-7]$/.test(prefs.world)?prefs.world:'all',search='';
    const save=()=>{state.dashboard={tab,world};try{root.localStorage.setItem(KEY,JSON.stringify({...saved,[account]:state}));}catch{storageError=true;}};
    const matches=row=>(world==='all'||row.world===Number(world))&&`${row.name} ${row.hint} ${row.status||''}`.toLowerCase().includes(search.toLowerCase());
    const icon=row=>ICONS[row.page]?`<img src="assets/nav-${ICONS[row.page]}.png" alt="" width="30" height="30" loading="lazy">`:`<span aria-hidden="true">${row.world}</span>`;
    const card=row=>{
      const kind=classify(row),muted=!!state.hidden[row.id];
      return `<article class="daily-card daily-${kind}" data-routine="${row.id}"><div class="daily-activity"><span class="daily-icon">${icon(row)}</span><div class="daily-activity-title"><h4>${esc(row.name)}</h4><span>${row.repeat==='timers'?'Collection / cooldown':row.repeat==='weekly'?'Weekly':'Daily'}</span></div><span class="daily-signal" title="${kind==='ready'?'Ready in saved data':kind==='settled'?'Finished or unavailable':'Needs checking'}"></span></div><p class="daily-value">${esc(row.status||(kind==='settled'?'Unavailable in save':'Check in game'))}</p><details class="daily-task-detail"><summary>Details${muted?' · Hidden':''}</summary><p>${esc(row.hint)}</p>${row.detail?`<p>${esc(row.detail)}</p>`:''}${row.autoHidden?`<p class="daily-hidden-reason">${esc(row.autoHidden)}</p>`:''}<button type="button" class="secondary" data-hide-routine="${row.id}">${muted?'Restore activity':'Hide activity'}</button></details><div class="daily-card-actions">${row.page?`<button type="button" data-daily-link="${row.page}" aria-label="Open ${esc(row.name)}">Open ${esc(row.name)} <span aria-hidden="true">↗</span></button>`:row.url?`<a href="${esc(row.url)}" target="_blank" rel="noopener noreferrer">View guide ↗</a>`:'<span>Visit in game</span>'}</div></article>`;
    };
    const paint=()=>{
      const active=rows.filter(row=>!state.hidden[row.id]),ready=active.filter(row=>classify(row)==='ready'),unknown=active.filter(row=>classify(row)==='unknown');
      const counts=repeat=>ready.filter(row=>row.repeat===repeat).length;
      const tabs=[['overview','Ready now',ready.length],['daily','Daily',counts('daily')],['weekly','Weekly',counts('weekly')],['timers','Collections',counts('timers')],['unknown','Needs checking',unknown.length],['settled','Finished / unavailable',active.filter(row=>classify(row)==='settled').length],['hidden','Hidden',rows.length-active.length]];
      const scope=rows.filter(row=>matches(row)&&(tab==='hidden'?state.hidden[row.id]:!state.hidden[row.id]&&(tab==='unknown'?classify(row)==='unknown':tab==='settled'?classify(row)==='settled':classify(row)==='ready'&&(tab==='overview'||row.repeat===tab))));
      const showBosses=tab==='overview'||tab==='timers',bosses=showBosses?active.filter(row=>row.miniboss&&matches(row)):[];
      const activities=scope.filter(row=>!showBosses||!row.miniboss),worlds=[...new Set(activities.map(row=>row.world))].sort((a,b)=>a-b);
      const hasData=rows.some(row=>row.ready!=null);
      host.innerHTML=`<section class="dailies"><header class="daily-heading"><div><p class="eyebrow">Account status</p><h2>Daily overview</h2><p>See what is ready. Pick where to go next.</p></div><span class="daily-save-label">${hasData?'From your loaded save':'Waiting for account data'}</span></header>
      <div class="daily-summary">${[['overview',ready.length,'Ready now','Confirmed by your save'],['daily',counts('daily'),'Daily activities','Claims, attempts & rewards'],['weekly',counts('weekly'),'Weekly activities','Runs & weekly objectives'],['unknown',unknown.length,'Needs checking','Availability not confirmed']].map(([id,count,title,note])=>`<button type="button" data-summary="${id}" class="daily-metric ${tab===id?'active':''}" aria-pressed="${tab===id}"><span>${title}</span><strong>${count}</strong><small>${note}</small></button>`).join('')}</div>
      <div class="daily-workspace"><div class="daily-main"><nav class="daily-tabs" aria-label="Activity views">${tabs.map(([id,label,count])=>`<button type="button" data-frequency="${id}" class="${tab===id?'active':''}" aria-pressed="${tab===id}">${label}<span>${count}</span></button>`).join('')}</nav>
      <div class="daily-controls"><label class="daily-search"><span class="cloud-visually-hidden">Find an activity</span><input id="dailySearch" type="search" placeholder="Find an activity…" value="${esc(search)}"></label><label>World <select id="dailyWorld"><option value="all">All worlds</option>${WORLDS.slice(1).map((name,i)=>`<option value="${i+1}" ${world===String(i+1)?'selected':''}>World ${i+1}</option>`).join('')}</select></label><span>${scope.length} ${tab==='hidden'?'hidden':tab==='unknown'?'to check':tab==='settled'?'finished / unavailable':'ready'}${world!=='all'||search?' matching':''}</span></div>
      ${storageError?'<p class="daily-note" role="status">Browser storage is unavailable. Hidden activities and view preferences may not persist.</p>':''}
      ${tab==='unknown'?'<p class="daily-view-note">These activities need more data or a personal target. They are not counted as ready.</p>':tab==='settled'?'<p class="daily-view-note">No action confirmed in this save. Open Details to see whether an activity is finished, locked, or waiting.</p>':tab==='hidden'?'<p class="daily-view-note">Activities you chose to hide. Restore one from its Details panel.</p>':''}
      <div class="daily-worlds">${worlds.map(w=>`<section class="daily-world-group"><header><span class="daily-world-number">${w}</span><div><h3>${WORLDS[w]}</h3><span>World ${w}</span></div><small>${activities.filter(row=>row.world===w).length} activities</small></header><div class="daily-grid">${activities.filter(row=>row.world===w).map(card).join('')}</div></section>`).join('')||`<div class="daily-empty"><span aria-hidden="true">◇</span><h3>${!hasData?'Load your account to get started':tab==='hidden'?'No hidden activities':tab==='overview'||['daily','weekly','timers'].includes(tab)?'No confirmed activities in this view':'Nothing matches this view'}</h3><p>${!hasData?'Connect cloud sync or import your save to see available claims and attempts.':search||world!=='all'?'Try another search or world.':'Updates follow your game save. Needs checking contains activities we cannot confirm yet.'}</p></div>`}</div></div>
      <aside class="daily-aside">${showBosses?`<section class="daily-watch"><header><p class="eyebrow">Stacking spawns</p><h3>Miniboss watch</h3><p>Aim for two or more before a visit.</p></header>${bosses.map(row=>`<article class="daily-boss ${row.ready===true?'daily-boss-ready':''}" data-boss="${row.id}"><div><strong>${esc(row.name)}</strong><span>World ${row.world}</span></div><b>${row.count===null?'—':row.count}<small> / ${row.cap}</small></b><meter min="0" max="${row.cap}" value="${row.count??0}" aria-label="${esc(row.name)} saved spawns"></meter><small>${esc(row.count===null?'Spawn count unavailable':row.autoHidden||row.detail)}</small><details><summary>Where to go</summary><p>${esc(row.hint)}</p><a href="${esc(row.url)}" target="_blank" rel="noopener noreferrer">Spawn guide ↗</a></details></article>`).join('')||'<p class="daily-note">No minibosses match this view.</p>'}</section>`:''}
      <section class="daily-freshness"><span class="daily-live-dot" aria-hidden="true"></span><h3>Let the save do the tracking</h3><p>Play, then sync. Available counters update and finished activities leave Ready now automatically.</p><p>No manual completion marks. Hidden activities stay hidden for this account.</p><small>These are saved values, not live countdowns. Cloud updates may need Apply update in the toolbar.</small></section></aside></div></section>`;
      const focus=selector=>host.querySelector(selector)?.focus();
      host.querySelectorAll('[data-frequency],[data-summary]').forEach(button=>button.onclick=()=>{tab=button.dataset.frequency||button.dataset.summary;save();paint();focus(`[data-frequency="${tab}"]`);});
      host.querySelector('#dailyWorld').onchange=e=>{world=e.target.value;save();paint();focus('#dailyWorld');};
      host.querySelector('#dailySearch').oninput=e=>{search=e.target.value;const cursor=e.target.selectionStart;paint();focus('#dailySearch');host.querySelector('#dailySearch').setSelectionRange(cursor,cursor);};
      host.querySelectorAll('[data-hide-routine]').forEach(button=>button.onclick=()=>{state.hidden[button.dataset.hideRoutine]=!state.hidden[button.dataset.hideRoutine];save();paint();focus('[data-frequency="hidden"]');});
      host.querySelectorAll('[data-daily-link]').forEach(button=>button.onclick=()=>root.dispatchEvent(new CustomEvent('idleon:navigate',{detail:button.dataset.dailyLink})));
    };
    paint();
  }
  const api={...M,classify,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Dailies=api;
})(typeof window==='undefined'?globalThis:window);
