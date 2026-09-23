(function(root){'use strict';
  const arcade=root.ArcadePages;if(!arcade)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const coralNames=['Woodular Shrine','Isaacian Shrine','Crystal Shrine','Pantheon Shrine','Clover Shrine','Summereading Shrine','Gilded Coral','Twisted Coral','Eternal Coral'];
  const originalRender=arcade.render;
  arcade.render=async(host,key,raw,afterRender)=>{
    if(key!=='dancingCoral')return originalRender(host,key,raw,afterRender);
    host.innerHTML='<div class="dancing-coral-game"><header><span>DANCING CORAL</span></header><p class="dance-loading">Loading coral dances…</p></div>';
    try{
      const groups=await root.BonusSystems.getRowsAsync(raw);
      const rows=groups.dancingCoral||[];
      const dances=rows.map((row,index)=>({name:coralNames[index]||row.name||`Coral Dance ${index+1}`,effect:row.effect||'Effect unavailable',state:row.level||'Unknown',owned:row.status==='active',icon:`assets/Coral${index%6+3}.png`}));
      host.innerHTML=`<div class="dancing-coral-game"><header><span>DANCING CORAL</span></header><main>${dances.map((dance,index)=>`<article class="dance-row ${dance.owned?'owned':''}"><img src="${dance.icon}" alt=""><div class="dance-shrine"><strong>+100 Max LV for</strong><span>${esc(dance.name)}</span></div><i>&amp;</i><div class="dance-effect"><strong>${esc(dance.effect)}</strong><span>${esc(dance.state)}</span></div></article>`).join('')||'<p class="dance-loading">Load a save to view your coral dances.</p>'}</main></div>`;
    }catch{host.innerHTML='<p class="collection-note">Could not load Dancing Coral data from this save.</p>';}
    afterRender?.();
  };
})(window);
