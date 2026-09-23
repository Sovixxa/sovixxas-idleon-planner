(function(root){'use strict';
  const arcade=root.ArcadePages;if(!arcade)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&#39;'}[c]));
  const names=['Brain Coral','Pillar Coral','Anemone Coral','Paragorgia Coral','Clover Coral','Aegean Coral'];
  const originalRender=arcade.render;
  arcade.render=async(host,key,raw,afterRender)=>{
    if(key!=='coralReef')return originalRender(host,key,raw,afterRender);
    host.innerHTML='<div class="coral-reef-game"><p class="coral-loading">Loading Coral Reef…</p></div>';
    try{
      const rows=(await root.BonusSystems.getRowsAsync(raw)).coralReef||[];
      host.innerHTML=`<div class="coral-reef-game"><header><span>CORAL REEF</span><strong><img src="assets/Coral0.png" alt="">${rows.length} REEFS<small>Permanent upgrades</small></strong></header><main>${rows.map((reef,index)=>`<article class="reef-game-card reef-${index} ${reef.status==='missing'?'locked':''}"><h2>${esc(names[index]||reef.name||`Coral ${index+1}`)}</h2><div class="reef-art">${Array.from({length:12},()=>`<img src="assets/Coral${index%6}.png" alt="">`).join('')}</div><p>${esc(reef.effect)}</p><footer><strong>${esc(reef.level||'LOCKED')}</strong><button type="button" disabled>UPGRADE</button></footer></article>`).join('')||'<p class="coral-loading">Load a save to view Coral Reef upgrades.</p>'}</main></div>`;
    }catch{host.innerHTML='<p class="collection-note">Could not load Coral Reef data from this save.</p>';}
    afterRender?.();
  };
})(window);
