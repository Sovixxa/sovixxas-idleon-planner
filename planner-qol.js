(function(root){
  'use strict';
  const KEY='idleon-planner-qol-v1', SNAPSHOT_KEY='idleon-planner-snapshot-v1';
  const EXTRA_KEYS=['idleon-dailies-v1','idleon-planner-quick-notes-v1','idleon-planner-quick-notes-collapsed-v1','idleon-planner-quick-notes-position-v1','idleon-account-review-plan-v1'];
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const parse=value=>{try{return typeof value==='string'?JSON.parse(value):value;}catch{return null;}};
  const defaults=()=>({favorites:[],notes:{},goals:[],tasks:[],pages:{},groups:{},lastPage:'home',resetHour:0,resetDay:1});
  const safeKey=k=>!['__proto__','prototype','constructor'].includes(k);
  function validate(value){
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid planner settings.');
    const out=defaults();
    for(const key of ['favorites','goals','tasks'])if(value[key]!==undefined){if(!Array.isArray(value[key])||value[key].length>500)throw Error('Invalid '+key);out[key]=value[key];}
    if(out.favorites.some(x=>typeof x!=='string'||x.length>100))throw Error('Invalid favorites.');
    for(const key of ['notes','pages','groups'])if(value[key]!==undefined){if(!value[key]||typeof value[key]!=='object'||Array.isArray(value[key])||Object.keys(value[key]).some(k=>!safeKey(k)))throw Error('Invalid '+key);out[key]=value[key];}
    if(Object.values(out.notes).some(x=>typeof x!=='string'||x.length>100000))throw Error('Invalid notes.');
    for(const g of out.goals)if(!g||typeof g.id!=='string'||typeof g.name!=='string'||typeof g.page!=='string'||!Number.isFinite(g.current)||!Number.isFinite(g.target)||g.current<0||g.target<=0||(g.metric!==undefined&&typeof g.metric!=='string'))throw Error('Invalid goal.');
    for(const t of out.tasks)if(!t||typeof t.id!=='string'||typeof t.name!=='string'||!['once','daily','weekly'].includes(t.repeat)||(t.done!==null&&!Number.isFinite(t.done)))throw Error('Invalid task.');
    for(const p of Object.values(out.pages))if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!safeKey(k))||Object.values(p).some(v=>!['string','boolean'].includes(typeof v)))throw Error('Invalid page preferences.');
    if(Object.values(out.groups).some(v=>typeof v!=='boolean'))throw Error('Invalid sidebar preferences.');
    if(typeof value.lastPage==='string')out.lastPage=value.lastPage;
    if(Number.isInteger(value.resetHour)&&value.resetHour>=0&&value.resetHour<=23)out.resetHour=value.resetHour;
    if(Number.isInteger(value.resetDay)&&value.resetDay>=0&&value.resetDay<=6)out.resetDay=value.resetDay;
    return out;
  }
  function periodStart(now,repeat,hour=0,day=1){
    const date=new Date(now);date.setHours(hour,0,0,0);if(date.getTime()>now)date.setDate(date.getDate()-1);
    if(repeat==='weekly')date.setDate(date.getDate()-(date.getDay()-day+7)%7);
    return date.getTime();
  }
  function isDone(task,now,settings){return task.done!==null&&(task.repeat==='once'||task.done>=periodStart(now,task.repeat,settings.resetHour,settings.resetDay));}
  function levelNumber(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    const match=String(value??'').match(/^(?:Lv\.?\s*|Level\s*)?([\d,]+(?:\.\d+)?)(?=\s*(?:\/|·|$|MAX))/i);
    return match?Number(match[1].replaceAll(',','')):null;
  }
  function completed(row){
    if(['maxed','completed','complete'].includes(row.status))return true;
    const label=String(row.level??'');if(/\bMAX(?:ED)?\b/.test(label))return true;
    const m=label.match(/^(?:Lv\.?\s*)?([\d,]+)\s*\/\s*([\d,]+)\s*$/i);
    return !!m&&Number(m[2].replaceAll(',',''))>0&&Number(m[1].replaceAll(',',''))>=Number(m[2].replaceAll(',',''));
  }
  function snapshot(raw,groups,now=Date.now()){
    const data=raw.data||raw, names=raw.charNames||[], rows={}, seen=new Map();
    for(const [page,list] of Object.entries(groups||{}))if(Array.isArray(list))for(const row of list){
      if(!row?.name)continue;
      const base=JSON.stringify([page,row.source||'',row.name]),n=seen.get(base)||0;seen.set(base,n+1);
      rows[base+':'+n]={page,name:String(row.name),source:String(row.source||''),level:String(row.level??''),value:levelNumber(row.level),status:String(row.status||''),complete:completed(row),effect:String(row.effect||'')};
    }
    for(const key of Object.keys(data)){const m=key.match(/^Lv0_(\d+)$/);if(!m)continue;const lv=parse(data[key]),value=Number(lv?.[0]);if(Number.isFinite(value))rows['character:'+m[1]]={page:'characters',name:names[Number(m[1])]||'Character '+(Number(m[1])+1),source:'Character level',level:String(value),value,status:'active',complete:false,effect:''};}
    const time=parse(data.TimeAway),candidate=Number(time?.Player);
    return {version:1,account:String(names[0]||'unnamed-export'),importedAt:now,savedAt:Number.isFinite(candidate)&&candidate>946684800000&&candidate<=now+300000?candidate:null,rows};
  }
  function compare(previous,current){
    if(!previous||previous.account!==current.account)return [];
    const changes=[];
    for(const [id,row] of Object.entries(current.rows)){const old=previous.rows[id];if(!old)continue;
      const unlock=['missing','locked'].includes(old.status)&&!['missing','locked'].includes(row.status);
      if(old.level!==row.level||unlock||old.complete!==row.complete)changes.push({...row,id,before:old.level,kind:!old.complete&&row.complete?'Completed':unlock?'Unlocked':row.value!==null&&old.value!==null&&row.value>old.value?'Level gained':'Changed'});
    }
    return changes;
  }
  function init({pages,navigate}){
    const doc=root.document;if(!doc)return;
    let settings;try{settings=validate(parse(localStorage.getItem(KEY))||defaults());}catch{settings=defaults();}
    let current='home', latest=null, previous=null, changes=[], importToken=0, restoring=false, restoreBudget=0, pending=false;
    let searchRows=[], searchQuery='', activeAccount=null;
    const registry={home:{title:'Home'},jelly:{title:'Jelly Operator'},...pages};
    const read=k=>{try{return localStorage.getItem(k);}catch{return null;}};
    const notice=message=>{doc.getElementById('qolStatus').textContent=message;};
    const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(settings));}catch{notice('Browser storage is full or unavailable. Export a backup to keep your changes.');}};
    const title=key=>registry[key]?.title||key;
    const go=key=>{if(registry[key])navigate(key);};
    const shell=doc.querySelector('.shell');
    const bar=doc.createElement('section');bar.className='qol-bar';bar.setAttribute('aria-label','Planner shortcuts');
    bar.innerHTML='<div class="qol-actions"><button id="qolSearchOpen" class="secondary">Search <kbd>Ctrl K</kbd></button><button id="qolFavorite" class="secondary" aria-pressed="false">☆ Favorite</button><button id="qolNotesOpen" class="secondary">Page notes</button><button id="qolPlanOpen" class="secondary">Goals & checklist</button><button id="qolChangesOpen" class="secondary">Changes</button><button id="qolBackupOpen" class="secondary">Backup</button></div><div class="qol-meta"><span id="qolPageName">Home</span><span id="qolFreshness">No save loaded</span><label><input id="qolHideDone" type="checkbox"> Hide maxed / completed</label><span id="qolHiddenCount"></span></div><p id="qolStatus" role="status"></p>';
    shell.prepend(bar);
    const favorites=doc.createElement('nav');favorites.className='qol-favorites';favorites.setAttribute('aria-label','Favorite pages');doc.getElementById('navHome').after(favorites);
    const dialog=doc.createElement('dialog');dialog.className='qol-dialog';dialog.setAttribute('aria-labelledby','qolDialogTitle');doc.body.append(dialog);
    const homeGoals=doc.createElement('section');homeGoals.className='qol-home-goals';homeGoals.setAttribute('aria-label','Pinned goals');doc.getElementById('characterDashboard')?.before(homeGoals);
    const button=(id,fn)=>doc.getElementById(id).addEventListener('click',fn);
    function openDialog(heading,html){
      dialog.innerHTML=`<header><h2 id="qolDialogTitle">${esc(heading)}</h2><button class="secondary" data-close aria-label="Close dialog">Close</button></header><div class="qol-dialog-body">${html}</div>`;
      dialog.querySelector('[data-close]').onclick=()=>dialog.close();if(!dialog.open)dialog.showModal();
    }
    dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
    function paintFavorites(){
      favorites.innerHTML=settings.favorites.filter(k=>registry[k]).map(k=>`<button class="side-link${k===current?' active':''}" data-go="${esc(k)}">★ ${esc(title(k))}</button>`).join('');
      favorites.hidden=!favorites.children.length;favorites.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
      doc.getElementById('qolFavorite').textContent=settings.favorites.includes(current)?'★ Favorited':'☆ Favorite';doc.getElementById('qolFavorite').setAttribute('aria-pressed',String(settings.favorites.includes(current)));
    }
    button('qolFavorite',()=>{settings.favorites=settings.favorites.includes(current)?settings.favorites.filter(k=>k!==current):[...settings.favorites,current];save();paintFavorites();});
    function search(){
      openDialog('Find a page or bonus','<label>Search pages, systems, and imported bonuses<input id="qolQuery" type="search" autocomplete="off" placeholder="Printer, stamps, damage…"></label><p class="qol-help">Enter opens the first result. Tab moves through results. Escape closes.</p><div id="qolResults"></div>');
      const input=doc.getElementById('qolQuery');input.value=searchQuery;input.oninput=()=>{searchQuery=input.value;paintSearch();};input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();dialog.querySelector('[data-open-result]')?.click();}if(e.key==='ArrowDown'){e.preventDefault();dialog.querySelector('[data-open-result]')?.focus();}};paintSearch();input.focus();
    }
    function paintSearch(){
      const host=doc.getElementById('qolResults');if(!host)return;
      const query=searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean),matches=text=>query.every(q=>text.toLowerCase().includes(q));
      const result=[...Object.entries(registry).filter(([key,p])=>matches(`${key} ${p.title} ${p.world||''} ${p.copy||''}`)).map(([page,p])=>({page,name:p.title,source:p.world||'Page'})),...(query.length?searchRows.filter(r=>matches(`${r.name} ${r.source} ${r.effect}`)):[])].slice(0,60);
      host.innerHTML=result.map((r,i)=>`<article class="qol-result"><button class="secondary" data-open-result="${i}"><strong>${esc(r.name)}</strong><small>${esc(r.source)}${r.level?' · '+esc(r.level):''}</small></button>${r.value!=null?`<button class="secondary" data-track="${i}">Track goal</button>`:''}</article>`).join('')||'<p>No matches. Import a save to search its decoded bonuses.</p>';
      host.querySelectorAll('[data-open-result]').forEach(b=>b.onclick=()=>{dialog.close();go(result[Number(b.dataset.openResult)].page);});
      host.querySelectorAll('[data-track]').forEach(b=>b.onclick=()=>goalForm(result[Number(b.dataset.track)]));
    }
    button('qolSearchOpen',search);doc.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();search();}});
    function notes(){
      const page=current;openDialog(title(page)+' notes','<label>Notes for this page<textarea id="qolPageNote" rows="12" placeholder="What do you want to remember here?"></textarea></label><p class="qol-help">Saved in this browser as you type. Your general notepad stays separate.</p>');
      const input=doc.getElementById('qolPageNote');input.value=settings.notes[page]||'';input.oninput=()=>{settings.notes[page]=input.value;save();paintNotes();};input.focus();
    }
    const paintNotes=()=>doc.getElementById('qolNotesOpen').textContent=settings.notes[current]?'Page notes •':'Page notes';
    button('qolNotesOpen',notes);
    function goalValue(g){return g.metric&&latest&&g.account===latest.account?latest.rows[g.metric]?.value??g.current:g.current;}
    function paintHomeGoals(){
      homeGoals.hidden=!settings.goals.length;
      homeGoals.innerHTML=settings.goals.length?`<div class="qol-section-head"><h3>Pinned goals</h3><button class="secondary" data-manage-goals>Manage goals</button></div><div class="qol-goals">${settings.goals.slice(0,6).map(g=>{const value=goalValue(g);return `<button class="secondary qol-goal" data-home-goal="${esc(g.page)}"><strong>${esc(g.name)}</strong><span>${value.toLocaleString()} / ${g.target.toLocaleString()}${value>=g.target?' · Complete':''}</span><progress value="${Math.min(value,g.target)}" max="${g.target}"></progress></button>`;}).join('')}</div>`:'';
      homeGoals.querySelector('[data-manage-goals]')?.addEventListener('click',plan);homeGoals.querySelectorAll('[data-home-goal]').forEach(b=>b.onclick=()=>go(b.dataset.homeGoal));
    }
    function goalForm(metric=null,existing=null){
      const g=existing||{name:metric?.name||'',current:metric?.value||0,target:(metric?.value||0)+1,page:metric?.page||current};
      openDialog(existing?'Edit goal':'Pin a goal',`<form id="qolGoalForm"><label>Goal name<input name="name" required maxlength="160" value="${esc(g.name)}"></label><div class="qol-fields"><label>Current value<input name="current" type="number" min="0" step="any" required value="${goalValue(g)}" ${metric||g.metric?'readonly':''}></label><label>Target<input name="target" type="number" min="0.000001" step="any" required value="${g.target}"></label></div><label>Related page<select name="page">${Object.keys(registry).map(k=>`<option value="${esc(k)}" ${k===g.page?'selected':''}>${esc(title(k))}</option>`).join('')}</select></label><p class="qol-help">${metric||g.metric?'Current value updates from matching imported saves.':'Manual goal. Edit its current value as you make progress. Use “Track goal” in Search for automatic tracking.'}</p><button class="primary">Save goal</button></form>`);
      doc.getElementById('qolGoalForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),item={id:existing?.id||crypto.randomUUID(),name:String(f.get('name')).trim(),current:Number(f.get('current')),target:Number(f.get('target')),page:String(f.get('page'))};if(!item.name)return;if(metric||g.metric){item.metric=metric?.id||g.metric;item.account=g.account||latest?.account;}settings.goals=existing?settings.goals.map(x=>x.id===existing.id?item:x):[...settings.goals,item];save();plan();};
    }
    function plan(){
      paintHomeGoals();
      const now=Date.now();
      openDialog('Goals & checklist',`<div class="qol-section-head"><h3>Pinned goals</h3><button class="secondary" id="qolAddGoal">Add goal</button></div><div class="qol-goals">${settings.goals.map(g=>{const value=goalValue(g);return `<article class="qol-goal"><strong>${esc(g.name)}</strong><span>${value.toLocaleString()} → ${g.target.toLocaleString()}${value>=g.target?' · Complete':''}</span><progress value="${Math.min(value,g.target)}" max="${g.target}"></progress><small>${g.metric?(latest?.account===g.account&&latest.rows[g.metric]?'Updates from imported save':'Waiting for a matching save'):'Manual progress'}</small><div><button class="secondary" data-goal-page="${esc(g.page)}">${esc(title(g.page))}</button><button class="secondary" data-edit-goal="${esc(g.id)}">Edit</button><button class="secondary" data-delete-goal="${esc(g.id)}">Remove</button></div></article>`;}).join('')||'<p>No pinned goals yet. Add one or use “Track goal” in Search.</p>'}</div><h3>Repeating checklist</h3><p class="qol-help">Personal reminders. Resets use your device’s local time; set these to match your routine.</p><form id="qolTaskForm" class="qol-fields"><label>Task<input name="name" required maxlength="160" placeholder="Check refinery salts"></label><label>Repeat<select name="repeat"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="once">Once</option></select></label><button class="primary">Add task</button></form><div class="qol-fields"><label>Reset hour (local)<select id="qolResetHour">${Array.from({length:24},(_,i)=>`<option value="${i}" ${i===settings.resetHour?'selected':''}>${String(i).padStart(2,'0')}:00</option>`).join('')}</select></label><label>Weekly reset<select id="qolResetDay">${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d,i)=>`<option value="${i}" ${i===settings.resetDay?'selected':''}>${d}</option>`).join('')}</select></label><button id="qolResetTasks" class="secondary">Reset checks now</button></div><div>${settings.tasks.map(t=>`<div class="qol-task"><label><input type="checkbox" data-task="${esc(t.id)}" ${isDone(t,now,settings)?'checked':''}> ${esc(t.name)} <small>${t.repeat}</small></label><button class="secondary" data-delete-task="${esc(t.id)}" aria-label="Remove ${esc(t.name)}">Remove</button></div>`).join('')||'<p>No repeating tasks yet.</p>'}</div><h3>Account Review · My Plan</h3><p>Your saved upgrade recommendations remain in Account Review.</p><button id="qolReviewPlan" class="secondary">Open My Plan</button>`);
      button('qolAddGoal',()=>goalForm());button('qolReviewPlan',()=>{dialog.close();go('accountReview');});
      dialog.querySelectorAll('[data-goal-page]').forEach(b=>b.onclick=()=>{dialog.close();go(b.dataset.goalPage);});
      dialog.querySelectorAll('[data-edit-goal]').forEach(b=>b.onclick=()=>goalForm(null,settings.goals.find(g=>g.id===b.dataset.editGoal)));
      dialog.querySelectorAll('[data-delete-goal]').forEach(b=>b.onclick=()=>{settings.goals=settings.goals.filter(g=>g.id!==b.dataset.deleteGoal);save();plan();});
      dialog.querySelectorAll('[data-task]').forEach(b=>b.onchange=()=>{settings.tasks.find(t=>t.id===b.dataset.task).done=b.checked?Date.now():null;save();});
      dialog.querySelectorAll('[data-delete-task]').forEach(b=>b.onclick=()=>{settings.tasks=settings.tasks.filter(t=>t.id!==b.dataset.deleteTask);save();plan();});
      doc.getElementById('qolTaskForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),name=String(f.get('name')).trim();if(!name)return;settings.tasks.push({id:crypto.randomUUID(),name,repeat:String(f.get('repeat')),done:null});save();plan();};
      for(const [id,key] of [['qolResetHour','resetHour'],['qolResetDay','resetDay']])doc.getElementById(id).onchange=e=>{settings[key]=Number(e.target.value);save();plan();};
      button('qolResetTasks',()=>{settings.tasks.forEach(t=>t.done=null);save();plan();});
    }
    button('qolPlanOpen',plan);
    function showChanges(){
      const message=!latest?'Import a save to start tracking progress.':!previous?'Baseline saved. Import another save from this account to compare progress.':previous.account!==latest.account?'Different account detected. A new baseline was saved; accounts are not compared.':`${changes.length} changes since ${new Date(previous.importedAt).toLocaleString()}.`;
      openDialog('What changed?',`<p>${esc(message)}</p><p class="qol-help">Compares character levels and decoded system levels, unlocks, and completion states. Values reflect the imported saves.</p><div>${changes.slice(0,500).map(r=>`<article class="qol-change"><span class="qol-tag">${esc(r.kind)}</span><strong>${esc(r.name)}</strong><span>${esc(r.before||'—')} → ${esc(r.level||'—')}</span><button class="secondary" data-change-page="${esc(r.page)}">${esc(title(r.page))}</button></article>`).join('')}${changes.length>500?'<p>Showing the first 500 changes.</p>':''}</div>`);
      dialog.querySelectorAll('[data-change-page]').forEach(b=>b.onclick=()=>{dialog.close();go(b.dataset.changePage);});
    }
    button('qolChangesOpen',showChanges);
    function backup(){
      openDialog('Personal settings backup','<p>Export favorites, page preferences, notes, goals, checklists, and Account Review’s My Plan. Game saves and import history are not included.</p><button id="qolExport" class="primary">Download backup</button><label class="qol-import">Restore backup<input id="qolRestore" type="file" accept=".json,application/json"></label><p id="qolBackupStatus" role="status"></p><div id="qolRestorePreview"></div>');
      button('qolExport',()=>{const extra={};for(const k of EXTRA_KEYS){const value=read(k);if(value!==null)extra[k]=value;}const blob=new Blob([JSON.stringify({format:'idleon-planner-backup',version:1,settings,extra},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=doc.createElement('a');a.href=url;a.download='idleon-planner-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
      doc.getElementById('qolRestore').onchange=async e=>{
        const status=doc.getElementById('qolBackupStatus'),preview=doc.getElementById('qolRestorePreview');preview.innerHTML='';
        try{const file=e.target.files[0];if(!file)return;if(file.size>4000000)throw Error('Backup is too large (maximum 4 MB).');const payload=JSON.parse(await file.text());if(payload.format!=='idleon-planner-backup'||payload.version!==1)throw Error('Choose a version 1 planner backup.');const next=validate(payload.settings),extra=payload.extra||{};
          for(const [k,v] of Object.entries(extra))if(!EXTRA_KEYS.includes(k)||typeof v!=='string')throw Error('Backup contains unsupported settings.');
          const planValue=extra['idleon-account-review-plan-v1'];if(planValue){const planData=parse(planValue);if(!Array.isArray(planData)||planData.some(x=>!x||typeof x.id!=='string'||typeof x.name!=='string'))throw Error('Invalid My Plan backup.');}
          status.textContent=`Ready: ${next.favorites.length} favorites, ${Object.keys(next.notes).length} page notes, ${next.goals.length} goals, ${next.tasks.length} tasks. Restoring replaces your personal settings.`;
          preview.innerHTML='<button id="qolApplyRestore" class="primary">Restore these settings</button>';
          button('qolApplyRestore',()=>{const keys=[KEY,...EXTRA_KEYS],old=Object.fromEntries(keys.map(k=>[k,read(k)]));try{localStorage.setItem(KEY,JSON.stringify(next));for(const k of EXTRA_KEYS){if(k in extra)localStorage.setItem(k,extra[k]);else localStorage.removeItem(k);}}catch{for(const k of keys)try{if(old[k]===null)localStorage.removeItem(k);else localStorage.setItem(k,old[k]);}catch{}status.textContent='Could not restore: browser storage is full or unavailable. Your existing settings were retained where possible.';return;}settings=next;paintFavorites();paintNotes();const notepad=doc.getElementById('quickNotesInput');if(notepad)notepad.value=extra['idleon-planner-quick-notes-v1']||'';applyGroups();go(registry[settings.lastPage]?settings.lastPage:'home');status.textContent='Settings restored. Reload to apply the restored notepad position.';preview.innerHTML='';});
        }catch(error){status.textContent=error.message;}
      };
    }
    button('qolBackupOpen',backup);
    function freshness(){
      const host=doc.getElementById('qolFreshness');if(!latest){host.textContent='No save loaded';return;}
      const time=latest.savedAt||latest.importedAt,minutes=Math.max(0,Math.floor((Date.now()-time)/60000)),age=minutes<60?minutes+'m':minutes<1440?Math.floor(minutes/60)+'h':Math.floor(minutes/1440)+'d';
      host.textContent=(latest.savedAt?'Save age: ':'Imported: ')+age+(latest.savedAt?'':' ago');host.title=(latest.savedAt?'Save timestamp: ':'Save timestamp unavailable. Imported: ')+new Date(time).toLocaleString();host.classList.toggle('qol-stale',minutes>=1440);
    }
    const content=doc.getElementById('worldContent');
    function fieldKey(el){if(el.id)return 'field:#'+el.id;return 'field:'+el.tagName+':'+(el.name||el.getAttribute('aria-label')||el.getAttribute('placeholder')||Array.from(el.attributes).filter(a=>a.name.startsWith('data-')).map(a=>a.name).join('|'));}
    const controls=()=>[...content.querySelectorAll('select,input[type="search"],input[type="checkbox"]')].filter(el=>!el.closest('.dailies')).filter(el=>el.id||el.name||el.getAttribute('aria-label')||el.getAttribute('placeholder')||Array.from(el.attributes).some(a=>a.name.startsWith('data-')));
    const tabKey=el=>Array.from(el.attributes).find(a=>(/^data-.*(?:tab|page|loadout|preset)$/.test(a.name)||a.name==='data-category')&&!['data-skill-tab','data-hole-group','data-page'].includes(a.name));
    const pref=()=>settings.pages[current]||(settings.pages[current]={});
    content.addEventListener('input',remember,true);content.addEventListener('change',remember,true);
    function remember(e){if(restoring||!controls().includes(e.target))return;restoreBudget=0;pref()[fieldKey(e.target)]=e.target.type==='checkbox'?e.target.checked:e.target.value;save();}
    content.addEventListener('click',e=>{if(restoring)return;const b=e.target.closest('button');if(!b)return;const attr=tabKey(b);if(attr){restoreBudget=0;pref()['tab:'+attr.name]=attr.value;save();}},true);
    function restore(){
      if(restoreBudget<=0)return;restoring=true;
      try{const p=pref();for(const el of controls()){const v=p[fieldKey(el)];if(v===undefined)continue;if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===v))continue;const old=el.type==='checkbox'?el.checked:el.value;if(old!==v){if(el.type==='checkbox')el.checked=v;else el.value=v;restoreBudget--;el.dispatchEvent(new Event(el.type==='search'?'input':'change',{bubbles:true}));return;}}
        for(const [key,value] of Object.entries(p)){if(!key.startsWith('tab:'))continue;const b=[...content.querySelectorAll('button')].find(b=>{const attr=tabKey(b);return attr?.name===key.slice(4)&&attr.value===value;});if(b&&!b.disabled&&!b.classList.contains('active')&&!b.classList.contains('selected')&&b.getAttribute('aria-selected')!=='true'){restoreBudget--;b.click();return;}}
      }finally{restoring=false;}
    }
    function hideCompleted(){
      const enabled=!!pref().hideDone;doc.getElementById('qolHideDone').checked=enabled;
      let count=0;const candidates=content.querySelectorAll('.arcade-tile,.bonus-system-grid>article,.bonus-system-card,.collection-card,.gem-shop-tile,.review-plan-item,.research-square,[data-qol-complete]');
      const completedNames=new Set(Object.values(latest?.rows||{}).filter(r=>r.page===current&&r.complete).map(r=>r.name));
      for(const el of candidates){const explicit=el.dataset.qolComplete==='true'||el.classList.contains('maxed')||el.classList.contains('complete');const marker=[...el.querySelectorAll('strong,b,.gem-shop-state')].some(n=>/^(?:✓\s*)?(?:MAX(?:ED)?|Completed)$/i.test(n.textContent.trim())||completed({level:n.textContent.trim()}));const name=el.querySelector('.arcade-name,h3')?.textContent.trim();const hide=enabled&&(explicit||marker||completedNames.has(name));el.classList.toggle('qol-completed-hidden',hide);if(hide)count++;}
      doc.getElementById('qolHiddenCount').textContent=enabled?count+' completed hidden':'';
    }
    doc.getElementById('qolHideDone').onchange=e=>{pref().hideDone=e.target.checked;save();hideCompleted();};
    new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;restore();hideCompleted();});}).observe(content,{childList:true,subtree:true});
    function applyGroups(){doc.querySelectorAll('.side-group>span').forEach(label=>{const collapsed=settings.groups[label.textContent.trim()];if(collapsed!==undefined){label.parentElement.classList.toggle('collapsed',collapsed);label.setAttribute('aria-expanded',String(!collapsed));}});}
    doc.querySelectorAll('.side-group>span').forEach(label=>{const record=()=>{settings.groups[label.textContent.trim()]=label.parentElement.classList.contains('collapsed');save();};label.addEventListener('click',record);label.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')record();});});applyGroups();
    function onNavigate(page){
      if(registry[page]?.parent){const parent=registry[page].parent;settings.pages[parent]||={};settings.pages[parent].lastSubtab=page;}
      current=page;settings.lastPage=page;restoreBudget=24;save();doc.getElementById('qolPageName').textContent=title(page);paintFavorites();paintNotes();paintHomeGoals();doc.getElementById('qolHideDone').checked=!!pref().hideDone;queueMicrotask(()=>{restore();hideCompleted();});
    }
    async function onImport(raw){
      const token=++importToken;doc.getElementById('qolFreshness').textContent='Reading save…';
      try{const groups=await root.BonusSystems.getRowsAsync(raw);if(token!==importToken)return;const next=snapshot(raw,groups);previous=latest||parse(read(SNAPSHOT_KEY));if(previous?.version!==1||!previous.rows)previous=null;latest=next;activeAccount=next.account;changes=compare(previous,next);
        searchRows=Object.entries(next.rows).filter(([,r])=>registry[r.page]).map(([id,r])=>({id,...r}));
        for(const g of settings.goals)if(g.metric&&g.account===activeAccount&&next.rows[g.metric]?.value!=null)g.current=next.rows[g.metric].value;
        save();try{localStorage.setItem(SNAPSHOT_KEY,JSON.stringify(next));}catch{notice('Import comparison is available this session. Browser storage could not save its baseline.');}
        doc.getElementById('qolChangesOpen').textContent=changes.length?`Changes (${changes.length})`:'Changes';freshness();paintSearch();hideCompleted();paintHomeGoals();
      }catch(error){if(token===importToken){doc.getElementById('qolFreshness').textContent='Import summary unavailable';notice('Could not prepare import comparison: '+error.message);}}
    }
    function clear(){importToken++;latest=null;searchRows=[];changes=[];previous=null;doc.getElementById('qolChangesOpen').textContent='Changes';freshness();}
    setInterval(()=>{freshness();if(dialog.open&&doc.getElementById('qolTaskForm'))dialog.querySelectorAll('[data-task]').forEach(el=>{const task=settings.tasks.find(t=>t.id===el.dataset.task);if(task)el.checked=isDone(task,Date.now(),settings);});},30000);
    paintFavorites();paintNotes();paintHomeGoals();
    return {onNavigate,onImport,clear,lastPage:()=>registry[settings.lastPage]?settings.lastPage:'home',resolvePage:page=>{const sub=settings.pages[page]?.lastSubtab;return registry[sub]?.parent===page?sub:page;}};
  }
  const api={init,validate,periodStart,isDone,levelNumber,completed,snapshot,compare};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PlannerQoL=api;
})(typeof window!=='undefined'?window:globalThis);
