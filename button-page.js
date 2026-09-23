(function(root){'use strict';
  const arcade=root.ArcadePages;if(!arcade)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const originalRender=arcade.render;
  arcade.render=async(host,key,raw,afterRender)=>{
    if(key!=='button')return originalRender(host,key,raw,afterRender);
    host.innerHTML='<div class="button-game"><header>THE BUTTON</header><p class="button-loading">Loading saved bonuses…</p></div>';
    try{
      const groups=await root.BonusSystems.getRowsAsync(raw),rows=groups.button||[];
      const nextPresses=rows.filter(row=>/current requirement|upcoming press/i.test(`${row.name||''} ${row.level||''}`)),bonuses=rows.filter(row=>!/current requirement|upcoming press/i.test(`${row.name||''} ${row.level||''}`));
      const tile=row=>`<article class="button-bonus"><strong>${esc(row.effect||row.name)}</strong><span>${esc(row.name||'Button bonus')}</span></article>`;
      host.innerHTML=`<div class="button-page-layout"><section class="button-game button-active-game"><header>THE BUTTON</header><h3>ACTIVE BONUSES</h3><div class="button-bonuses">${bonuses.map(tile).join('')||'<p class="button-loading">No active bonuses yet.</p>'}</div></section><section class="button-game button-next-game"><header>NEXT PRESSES</header><div class="button-bonuses next-presses">${nextPresses.map(tile).join('')||'<p class="button-loading">No upcoming requirements.</p>'}</div></section></div>`;
    }catch{host.innerHTML='<p class="collection-note">Could not load Button data from this save.</p>';}
    afterRender?.();
  };
})(window);
