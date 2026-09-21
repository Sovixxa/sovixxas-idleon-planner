(function(root){
  'use strict';
  const parse=v=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{return v;}}return v;};
  const letters='_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  // GamingStatType MSA_Bonus in the installed client. The final Skill3 slot
  // currently returns zero even when its Superbit is owned.
  const bonuses=[['Damage',7,1],['Cooking speed',13,13],['Sailing speed',3,1],['Gaming bits',20,50],['Class EXP',11,1.12],['Skill EXP',16,1],['Farming EXP',12,1.75,'jade'],['Jade coins',13,2,'jade'],['Essence',14,1.5,'jade'],['Spelunking POW',27,2.5,'over300'],['Research EXP',44,.3,'over300'],['Skill3',46,0]];
  function evaluate(data={},targetWave=null){
    const totems=parse(data.TotemInfo),gaming=parse(data.Gaming),ninja=parse(data.Ninja),saved=parse(totems?.[0]);
    if(targetWave!==null&&(Array.isArray(targetWave)?targetWave.length!==8||targetWave.some(n=>!Number.isSafeInteger(n)||n<0):!Number.isSafeInteger(targetWave)||targetWave<0))throw new RangeError('Enter a whole wave number of zero or more.');
    const waves=Array.from({length:8},(_,i)=>targetWave!==null?(Array.isArray(targetWave)?targetWave[i]:targetWave):saved?.[i]!=null&&Number.isFinite(Number(saved[i]))?Number(saved[i]):null);
    const total=waves.every(v=>v!==null)?waves.reduce((a,b)=>a+b,0):null;
    const owned=(value,id)=>value==null?null:String(value).includes(letters[id]);
    return {waves,total,bonuses:bonuses.map(([name,id,rate,type])=>{const active=owned(type==='jade'?ninja?.[102]?.[9]:gaming?.[12],id);return {name,active,source:type==='jade'?`Jade Emporium · MSA Expander ${['I','II','III'][id-12]}`:`Gaming Superbit #${id+1}`,value:active===false?0:active===null||total===null?null:rate*Math.max(0,Math.floor((total-(type==='over300'?300:0))/10))};})};
  }
  function render(host,data){
    const m=evaluate(data),fmt=n=>Math.round(n).toLocaleString();
    const art=model=>`<div class="worship-art" aria-hidden="true"></div><div class="worship-waves">${model.waves.map((n,i)=>`<div title="Totem ${i+1}"><small>Wave</small><strong>${n??'?'}</strong></div>`).join('')}</div>`;
    const grid=(model,compare=false)=>`<div class="worship-bonuses">${model.bonuses.map((b,i)=>{const current=m.bonuses[i].value,delta=b.value===null||current===null?null:Math.round(b.value)-Math.round(current);return `<div class="${b.active===false?'is-locked':''}" title="${b.source}"><span>${b.name}</span><strong>${b.value===null?'?':'+'+fmt(b.value)+'%'}</strong><small>${b.active===false?'Locked':b.active===null?'Unlock unknown':compare&&delta!==null?(delta===0?'No change':(delta>0?'+':'')+fmt(delta)+' percentage points'):''}</small></div>`;}).join('')}</div>`;
    host.innerHTML=`<div class="section-head compact"><div><p class="eyebrow">World 3</p><h2>Worship</h2></div></div><div class="worship-comparison"><section class="worship-totalizer"><h3>Your saved waves <small>${m.total===null?'Wave data unavailable':fmt(m.total)+' total waves'}</small></h3>${art(m)}${grid(m)}</section><section class="worship-totalizer worship-calculator"><h3>Wave calculator <small>Uses your current bonus unlocks</small></h3><div class="worship-art" aria-hidden="true"></div><div class="worship-waves worship-wave-inputs">${m.waves.map((n,i)=>`<label><small>Wave</small><input data-worship-wave="${i}" aria-label="Totem ${i+1} target wave" type="number" min="0" max="1000000" step="1" value="${n??0}" inputmode="numeric"></label>`).join('')}</div><p id="worshipInputError" class="worship-input-error" role="status"></p><div id="worshipProjection"></div></section></div><details class="worship-unlocks"><summary>Bonus unlocks & calculation notes</summary>${m.bonuses.map(b=>`<p><strong>${b.name}:</strong> ${b.source} · ${b.active===true?'Unlocked':b.active===false?'Not unlocked':'Save data missing'}</p>`).join('')}<p>Each input sets the wave for the totem directly above it, even if it is lower than your saved record. Differences compare the rounded bonuses shown in game; they are percentage points, not a final stat multiplier. Your saved layout is unchanged.</p><p>Skill3 currently gives 0% in the audited game client.</p></details>`;
    const inputs=Array.from(host.querySelectorAll('[data-worship-wave]'));
    const update=()=>{const waves=inputs.map(input=>Number(input.value)),error=host.querySelector('#worshipInputError'),output=host.querySelector('#worshipProjection');if(inputs.some((input,i)=>input.value.trim()===''||!Number.isSafeInteger(waves[i])||waves[i]<0||waves[i]>1000000)){error.textContent='Enter a whole wave number from 0 to 1,000,000 for each totem.';output.innerHTML='';return;}error.textContent='';const projected=evaluate(data,waves);output.innerHTML=`<p class="worship-projected-total">${fmt(projected.total)} total waves</p>${grid(projected,true)}`;};
    inputs.forEach(input=>input.addEventListener('input',update));update();
  }
  const api={evaluate,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Worship=api;
})(typeof window!=='undefined'?window:globalThis);
