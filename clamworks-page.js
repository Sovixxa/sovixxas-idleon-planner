(function(root){'use strict';
  const arcade=root.ArcadePages;if(!arcade)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&#39;'}[c]));
  const originalRender=arcade.render;
  arcade.render=async(host,key,raw,afterRender)=>{
    if(key!=='clamworks')return originalRender(host,key,raw,afterRender);
    host.innerHTML='<div class="clamworks-game"><p class="clam-loading">Loading Clamworks…</p></div>';
    try{
      const rows=(await root.BonusSystems.getRowsAsync(raw)).clamworks||[],levelRows=rows.filter(x=>/^Lv\b/i.test(String(x.level||''))),upgrades=levelRows.length?levelRows:rows.slice(0,9),rewards=rows.filter(x=>!upgrades.includes(x));
      host.innerHTML=`<div class="clamworks-game"><header><img src="assets/ClamPearl0.png" alt=""><strong>THE CLAMWORKS</strong></header><div class="clamworks-body"><aside><img src="assets/Clam.png" alt=""><b>WORKER CLASS</b><strong>CLAMWORKS</strong><small>Promotion progress and pearl bonuses</small></aside><main><div class="clamworks-currency"><img src="assets/ClamPearl0.png" alt=""><strong>PEARL UPGRADES</strong><span>${upgrades.length} upgrades</span></div><div class="clam-upgrade-grid">${upgrades.map((x,i)=>`<article class="clam-upgrade ${x.status==='missing'?'locked':''}"><img src="assets/ClamPearl${i%2}.png" alt=""><h3>${esc(x.name)}</h3><span>${esc(x.level)}</span><p>${esc(x.effect)}</p></article>`).join('')||'<p class="clam-loading">Load a save to view Clamworks upgrades.</p>'}</div></main></div><footer><h3>THE FRUITS OF YOUR LABOR INCLUDE:</h3><div>${rewards.map(x=>`<p>${esc(x.effect)}</p>`).join('')||'<p>Promotion rewards will appear here.</p>'}</div></footer></div>`;
    }catch{host.innerHTML='<p class="collection-note">Could not load Clamworks data from this save.</p>';}
    afterRender?.();
  };
})(window);
