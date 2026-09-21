/* Saved Construction layout: CogO[0..95] = 12x8 board, [96..107] =
 * cog production, [108..227] = shelf, [228..251] = small cog rails.
 * CogM keys are the game's CogMapKeys; FlagU=-11 means unlocked. */
(function(root){
  'use strict';
  const parse=v=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{return v;}}return v;};
  const obj=v=>{const p=parse(v);return p?.h&&typeof p.h==='object'?p.h:p;};
  const labels={a:'Build rate / hour',b:'Construction EXP / hour',c:'Flag rate / hour',d:'Bonus Construction EXP',e:'Build rate boost',f:'Player Construction EXP boost',g:'Flag rate boost',j:'Speed to flags',k:'No effect',tinyFlag:'Total flag rate bonus',tinyBuild:'Total build rate bonus',tinyExp:'Total Construction EXP bonus'};
  const percent=new Set(['d','e','f','g','j','k','tinyFlag','tinyBuild','tinyExp']);
  function decode(data={},account={}){
    const order=obj(data.CogO??data.CogOrder),maps=obj(data.CogM??data.CogMap),unlocks=obj(data.FlagU??data.FlagUnlock),flags=obj(data.FlagP??data.FlagsPlaced);
    const names=account.charNames??[],placed=new Set(Object.values(flags||{}).map(Number).filter(n=>Number.isInteger(n)&&n>=0));
    const slots=Array.from({length:252},(_,index)=>{
      const raw=order?.[index],item=typeof raw==='string'?raw:'Blank',isPlayer=item.startsWith('Player_'),name=isPlayer?item.slice(7):item;
      const character=names.indexOf(name),lv=obj(data['Lv0_'+character]);
      const rawStats=obj(maps?.[index]),stats=rawStats&&typeof rawStats==='object'?{...rawStats}:{};
      const tiny=item.match(/^CogSm([_ab])(\d+)$/);
      if(tiny){const kind='_ab'.indexOf(tiny[1]),tier=Number(tiny[2]);stats[['tinyFlag','tinyBuild','tinyExp'][kind]]=Math.round([2,4,1][kind]*(25+25*tier*tier)*(1+tier/5));}
      const flagIndex=index>=228?index-228+96:index,flag=unlocks?.[flagIndex];
      return {index,item,name,isPlayer,character,classId:data['CharacterClass_'+character],level:lv?.[8]??null,stats,statsKnown:rawStats!=null&&typeof rawStats==='object',empty:item==='Blank'||item==='',known:raw!=null,locked:flag==null?null:Number(flag)!==-11,flag:placed.has(flagIndex),unlockProgress:flag==null?null:Number(flag),zone:index<96?'Board':index<108?'Cog production':index<228?'Cog shelf':'Small cog rail'};
    });
    return {available:order!=null,slots,board:slots.slice(0,96),production:slots.slice(96,108),shelf:slots.slice(108,228),left:slots.slice(228,240),right:slots.slice(240,252),placed:placed.size};
  }
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:1,notation:Math.abs(Number(n))>=10000?'compact':'standard'});
  function render(host,data,account){
    const model=decode(data,account),assets=new Set(root.COG_ASSETS||[]);
    if(!model.available){host.innerHTML='<p class="muted">This export has no cog layout. Load a full account export to see your saved board.</p>';return;}
    let metric='d',shelfPage=0;
    const sprite=s=>assets.has(s.item+'.png')?s.item+'.png':s.isPlayer&&assets.has('ClassIcons'+s.classId+'.png')?'ClassIcons'+s.classId+'.png':null;
    const title=s=>s.isPlayer?s.name:s.empty?(s.locked?'Locked tile':'Empty tile'):/^CogCry\d$/.test(s.item)?['Topaz','Ruby','Amethyst','Garnet','Emerald','Bluegem'][Number(s.item.slice(-1))]+' Cog':s.item.replace(/^Cog/,'Cog ');
    const value=s=>s.isPlayer?`Lv ${s.level??'?'}`:s.empty?'':s.stats[metric]!=null?fmt(s.stats[metric])+(percent.has(metric)?'%':''):s.statsKnown?'0'+(percent.has(metric)?'%':''):'?';
    function tile(s,small=false){const art=sprite(s);return `<button type="button" class="cog-slot ${small?'cog-small':''} ${s.empty?'is-empty':''} ${s.empty&&s.locked?'is-locked':''} ${s.isPlayer?'is-character':''}" data-cog-slot="${s.index}" title="${esc(title(s))} · ${esc(s.zone)} ${s.index<96?`R${Math.floor(s.index/12)+1} C${s.index%12+1}`:''}" aria-label="${esc(title(s))}, ${esc(s.zone)} slot ${s.index+1}">${art&&!s.empty?`<img src="assets/${art}" alt="">`:s.empty&&s.locked?'<span class="cog-lock">×</span>':''}${s.flag?'<span class="cog-flag">⚑</span>':''}${!small?`<small>${esc(value(s))}</small>`:''}</button>`;}
    function paint(){
      host.innerHTML=`<div class="cog-toolbar"><div><strong>Current saved layout</strong><small>Loaded JSON · 12 × 8 board · ${model.board.filter(s=>!s.empty).length} occupied · ${model.placed} flags placed</small></div><label>Show <select id="cogMetric"><option value="d">EXP bonus %</option><option value="a">Build / hour</option><option value="c">Flags / hour</option></select></label></div><div class="cog-workbench"><section class="cog-board-wrap" aria-label="Saved cog board"><div class="cog-rail">${model.left.map(s=>tile(s,true)).join('')}</div><div class="cog-main-board">${model.board.map(s=>tile(s)).join('')}</div><div class="cog-rail">${model.right.map(s=>tile(s,true)).join('')}</div></section><p class="cog-hint">Hover or click a cog for its saved stats. Numbers on cogs are their own bonuses; surrounding boosts are shown in details.</p><details class="cog-shelf-panel"><summary>Cog shelf · ${model.shelf.filter(s=>!s.empty).length} stored</summary><div class="cog-shelf-controls"><button id="cogPrev" ${shelfPage===0?'disabled':''}>‹</button><span>Page ${shelfPage+1} / 8</span><button id="cogNext" ${shelfPage===7?'disabled':''}>›</button></div><div class="cog-shelf-grid">${model.shelf.slice(shelfPage*15,shelfPage*15+15).map(s=>tile(s)).join('')}</div></details><details class="cog-production-panel"><summary>Characters making cogs · ${model.production.filter(s=>s.isPlayer).length}</summary><div class="cog-production-grid">${model.production.map(s=>`<div>${tile(s)}<span>${s.isPlayer?esc(s.name):'Empty'}<small>${['Basic','Decent','Superb','Ultimate'][Math.floor((s.index-96)/3)]}</small></span></div>`).join('')}</div></details></div><section id="cogDetail" class="exp-card cog-detail" hidden aria-live="polite"></section>`;
      host.querySelector('#cogMetric').value=metric;
      host.querySelector('#cogMetric').onchange=e=>{metric=e.target.value;paint();};
      host.querySelector('#cogPrev').onclick=()=>{shelfPage--;paint();host.querySelector('.cog-shelf-panel').open=true;};
      host.querySelector('#cogNext').onclick=()=>{shelfPage++;paint();host.querySelector('.cog-shelf-panel').open=true;};
      host.querySelectorAll('[data-cog-slot]').forEach(button=>{
        const s=model.slots[Number(button.dataset.cogSlot)];
        const bonuses=Object.entries(labels).filter(([key])=>s.stats[key]!=null).map(([key,label])=>`${label}: ${fmt(s.stats[key])}${percent.has(key)?'%':''}`);
        button.title += bonuses.length?'\n'+bonuses.join('\n'):'';
        if(s.stats.h)button.title+='\nTargets: '+s.stats.h;
        button.onclick=()=>{
          const panel=host.querySelector('#cogDetail');panel.hidden=false;
          panel.innerHTML=`<button id="cogClose" class="secondary" aria-label="Close cog details">Close</button><h3>${esc(title(s))}</h3><p class="muted">${s.zone}${s.index<96?` · Row ${Math.floor(s.index/12)+1}, column ${s.index%12+1}`:''}</p>${s.isPlayer?`<p>Construction level: <strong>${s.level??'Unavailable'}</strong></p>`:''}${s.empty?`<p>${s.locked===null?'Unlock status unavailable.':s.locked?'Place a flag here in game to unlock this tile.':'Unlocked and empty.'}</p>`:`${bonuses.length?`<dl>${Object.entries(labels).filter(([key])=>s.stats[key]!=null).map(([key,label])=>`<div><dt>${label}</dt><dd>${fmt(s.stats[key])}${percent.has(key)?'%':''}</dd></div>`).join('')}</dl>`:'<p>Individual stats are not present in this export.</p>'}${s.stats.h?`<p><strong>Boost targets:</strong> ${esc(s.stats.h)}</p>`:''}`}<p class="muted">This is the layout saved in your export. Import a new JSON after changing it in game.</p>`;
          host.querySelector('#cogClose').onclick=()=>{panel.hidden=true;};
        };
      });
    }
    paint();
  }
  const api={decode,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CogBoard=api;
})(typeof window!=='undefined'?window:globalThis);
