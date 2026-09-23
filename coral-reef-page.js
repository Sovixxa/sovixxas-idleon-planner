(function(root){'use strict';
  const world7=root.World7;if(!world7)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&#39;'}[c]));
  const fmt=v=>Number(v||0).toLocaleString(undefined,{maximumFractionDigits:2});
  const names=['Brain Coral','Pillar Coral','Anemone Coral','Paragorgia Coral','Clover Coral','Aegean Coral'];
  const originalRender=world7.render;
  world7.render=(host,kind,data)=>{
    if(kind!=='coral')return originalRender(host,kind,data);
    const m=world7.coral(data),reefs=m.reefs||[];
    host.innerHTML=`<div class="coral-reef-game"><header><span>CORAL REEF</span><strong><img src="assets/Coral0.png" alt="">${fmt(m.currency)}<small>Daily Coral</small></strong></header><main>${reefs.map((reef,index)=>`<article class="reef-game-card reef-${index} ${reef.unlocked?'':'locked'}"><h2>${esc(names[index]||`Coral ${index+1}`)}</h2><div class="reef-art">${Array.from({length:Math.min(12,Math.max(1,reef.max||1))},(_,i)=>`<img src="assets/Coral${index%6}.png" alt="">`).join('')}</div><p>${esc(reef.description)}</p><footer><strong>${reef.level>=reef.max?'MAXED OUT':`LV ${fmt(reef.level)} / ${fmt(reef.max)}`}</strong><button type="button" disabled>UPGRADE</button></footer></article>`).join('')}</main></div>`;
  };
})(window);
