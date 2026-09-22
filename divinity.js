(function(root){
  'use strict';
  const parse=value=>{if(typeof value==='string'){try{return JSON.parse(value);}catch{return null;}}return value;};
  const number=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const compact=value=>{if(value===null)return'Unknown';const n=Number(value),a=Math.abs(n);if(a>=1e18)return n.toExponential(2).replace('e+','e');for(const [size,suffix] of [[1e15,'Q'],[1e12,'T'],[1e9,'B'],[1e6,'M']])if(a>=size)return`${(n/size).toLocaleString(undefined,{maximumFractionDigits:2})}${suffix}`;return n.toLocaleString(undefined,{maximumFractionDigits:2});};
  const currentBonus=god=>god.baseBonus===null?god.blessing.replace('{','an account-scaled amount'):god.blessing.replace('{',compact(god.baseBonus));
  function decode(data={},account={},catalog=root.DIVINITY_CATALOG){
    const div=parse(data.Divinity),names=Array.isArray(account.charNames)?account.charNames:[];
    const inferred=Object.keys(data).map(k=>k.match(/^Lv0_(\d+)$/)).filter(Boolean).map(m=>Number(m[1]));
    const knownCount=Math.max(names.length,inferred.length),count=Math.min(12,knownCount||(Array.isArray(div)?12:0));
    const chars=Array.from({length:count},(_,id)=>{
      const levels=parse(data['Lv0_'+id]),exp=parse(data['Exp0_'+id]),req=parse(data['ExpReq0_'+id]);
      const styleId=number(div?.[id]),godId=number(div?.[12+id]);
      return {id,name:names[id]||`Character ${id+1}`,level:number(levels?.[14]),exp:number(exp?.[14]),expRequired:number(req?.[14]),styleId,godId,style:catalog.styles[styleId]||null,god:catalog.gods[godId]||null,meditating:data['AFKtarget_'+id]==='Divinity'};
    });
    const unlockedCount=number(div?.[25]);
    const gods=catalog.gods.map(god=>{const level=number(div?.[28+god.id]);return {...god,unlocked:unlockedCount===null?null:unlockedCount>god.id,level,baseBonus:level===null?null:god.id===2?null:level*god.blessingPerLevel,nextCost:level===null?null:god.costBase*Math.pow(god.costScale,level),linked:chars.filter(c=>c.godId===god.id).map(c=>c.name)};});
    return {available:Array.isArray(div),points:number(div?.[24]),unlockedCount,godRank:unlockedCount===null?null:Math.max(0,unlockedCount-10),unlinks:number(div?.[38]),atoms:number(div?.[39]),characters:chars,gods,styles:catalog.styles};
  }
  let activeTab='characters',selected=null;
  function render(host,data={},account={},afterRender){
    const model=decode(data,account),catalog=root.DIVINITY_CATALOG;
    function detail(kind,id){
      selected={kind,id};const panel=host.querySelector('#divinityDetail');if(!panel)return;
      host.querySelectorAll('[data-divinity-kind]').forEach(tile=>tile.classList.toggle('selected',tile.dataset.divinityKind===kind&&Number(tile.dataset.divinityId)===id));
      if(kind==='god'){
        const god=model.gods[id],status=god.unlocked===null?'Unlock status unknown':god.unlocked?'Unlocked':'Locked';
        panel.innerHTML=`<button class="secondary divinity-close" type="button">Close</button><p class="eyebrow">God ${id+1} · ${status}</p><h3><img src="${esc(god.icon)}" alt="">${esc(god.name)}</h3><p><strong>Link bonus:</strong> ${esc(god.major)}</p><p><strong>Minor link bonus:</strong> ${esc(god.minor.replaceAll('+{%','').replaceAll('+{',''))} <span class="muted">(scales with the linked character's Divinity level)</span></p><p><strong>Blessing Lv ${god.level===null?'?':god.level}:</strong> ${esc(god.level===null?god.blessing:currentBonus(god))}</p><p><strong>Next blessing:</strong> ${god.level===null?'Unknown':`${compact(god.nextCost)} ${esc(god.currency)}`}</p><p><strong>Linked:</strong> ${god.linked.length?esc(god.linked.join(', ')):'Nobody'}</p><p class="muted">Blessing values are base values. Account amplifiers and the special Nobisect efficiency formula are not folded into them.</p>`;
      }else{
        const style=catalog.styles[id],using=model.characters.filter(c=>c.styleId===id).map(c=>c.name);
        panel.innerHTML=`<button class="secondary divinity-close" type="button">Close</button><p class="eyebrow">Style · unlocks at Divinity Lv ${style.levelRequired}</p><h3>${esc(style.name)}</h3><p>${esc(style.description)}</p><p><strong>Base altar rates:</strong> ${style.divinity} Divinity/hr · ${style.exp} EXP/hr</p><p><strong>Using:</strong> ${using.length?esc(using.join(', ')):'Nobody'}</p><p class="muted">These are style base rates before account multipliers.</p>`;
      }
      panel.classList.remove('detail-dismissed');panel.querySelector('.divinity-close').onclick=()=>panel.classList.add('detail-dismissed');
    }
    function paint(){
      const linked=model.characters.filter(c=>c.god).length,meditating=model.characters.filter(c=>c.meditating).length;
      host.innerHTML=`<div class="section-head compact"><div><p class="eyebrow">World 5 · account and characters</p><h2>Divinity</h2><p>See every character's style and link, then check gods and saved blessing levels.</p></div><div class="divinity-summary"><strong>${compact(model.points)} Divinity</strong><span>${model.unlockedCount===null?'?':Math.min(10,model.unlockedCount)} / 10 gods · ${linked} linked</span></div></div><nav class="skill-tabs" role="tablist" aria-label="Divinity sections"><button class="skill-tab${activeTab==='characters'?' active':''}" data-div-tab="characters">Characters</button><button class="skill-tab${activeTab==='gods'?' active':''}" data-div-tab="gods">Gods & Blessings</button><button class="skill-tab${activeTab==='styles'?' active':''}" data-div-tab="styles">Styles</button></nav>${!model.available?'<section class="exp-card"><h3>Divinity data unavailable</h3><p>Load a complete account export to decode this page.</p></section>':activeTab==='characters'?`<div class="divinity-strip"><span>${meditating} meditating</span><span>${model.unlinks===null?'?':compact(model.unlinks)} weekly unlink${model.unlinks===1?'':'s'} left</span><span>God rank ${model.godRank===null?'?':model.godRank}</span></div><div class="divinity-characters">${model.characters.map(c=>`<article class="divinity-character"><div class="divinity-char-head">${c.god?`<img src="${esc(c.god.icon)}" alt="">`:'<span class="divinity-empty">—</span>'}<div><h3>${esc(c.name)}</h3><span>Divinity Lv ${c.level===null?'?':compact(c.level)}</span></div><i class="${c.meditating?'active':''}">${c.meditating?'At altar':'Away'}</i></div><div class="divinity-char-values"><span><small>Style</small><strong>${esc(c.style?.name||'Unknown')}</strong></span><span><small>Linked god</small><strong>${esc(c.god?.name||'None')}</strong></span></div></article>`).join('')}</div>`:activeTab==='gods'?`<div class="divinity-strip"><span>${compact(model.atoms)} atoms saved</span><span>Click a god for link and blessing details</span></div><div class="divinity-gods">${model.gods.map(g=>`<button type="button" class="divinity-god${g.unlocked===false?' locked':''}" data-divinity-kind="god" data-divinity-id="${g.id}"><img src="${esc(g.icon)}" alt=""><span>${esc(g.name)}</span><strong>${g.unlocked===null?'Unknown':g.unlocked?`Blessing Lv ${g.level===null?'?':g.level}`:'Locked'}</strong><small>${g.linked.length?esc(g.linked.join(', ')):'No links'}</small><div class="divinity-tip"><b>${esc(g.name)}</b><span>${esc(g.major)}</span><em>${esc(g.blessing)} · Lv ${g.level===null?'?':g.level}</em></div></button>`).join('')}</div>`:`<div class="divinity-styles">${model.styles.map(s=>`<button type="button" class="divinity-style" data-divinity-kind="style" data-divinity-id="${s.id}"><span>${s.id+1}</span><div><strong>${esc(s.name)}</strong><small>Lv ${s.levelRequired} · ${s.divinity} Div/hr · ${s.exp} EXP/hr</small></div><div class="divinity-tip"><b>${esc(s.name)}</b><span>${esc(s.description)}</span></div></button>`).join('')}</div>`}<section id="divinityDetail" class="exp-card divinity-detail detail-dismissed" aria-live="polite"></section>`;
      host.querySelectorAll('[data-div-tab]').forEach(button=>button.onclick=()=>{activeTab=button.dataset.divTab;selected=null;paint();});
      host.querySelectorAll('[data-divinity-kind]').forEach(button=>button.onclick=()=>detail(button.dataset.divinityKind,Number(button.dataset.divinityId)));
      if(selected&&host.querySelector(`[data-divinity-kind="${selected.kind}"][data-divinity-id="${selected.id}"]`))detail(selected.kind,selected.id);
      afterRender?.();
    }paint();
  }
  const api={decode,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Divinity=api;
})(typeof window!=='undefined'?window:globalThis);
