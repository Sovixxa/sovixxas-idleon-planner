(function(root){
  'use strict';
  const cfg={
    orion:{label:'Mega Feather',plural:'Mega Feathers',field:'ownedMegafeathers',prefix:'OwlFeather',count:10,effects:['Maple: multiplies all Feather generation by 10x.','Amethyst: doubles Orion’s base account bonuses.','Frostraven: Feather Generation makes all upgrades 1% cheaper per level.','Phoenix: raises Orion’s base account bonuses to 3x.','Obsidian: Feather Cheapener upgrades give +2 and +4 Feathers/sec per level.','Evergreen: raises Orion’s base account bonuses to 4x.','Pristine: Feather Restart gives a 5x bonus instead of 3x.','Lavathian: raises Orion’s base account bonuses to 5x.','Midas: Feather Generation costs rise 25% more slowly.','Fractal: raises Orion’s base account bonuses to 6x; each extra Fractal adds another +0.5x.']},
    poppy:{label:'Mega Fish',plural:'Mega Fish',field:'ownedMegafishes',prefix:'RooMG',count:12,effects:['Squid: unlocks the Tar Pit and its first 3 upgrades.','Sequin: raises Poppy’s base account bonuses to 1.5x.','Nautilus: adds 2 reset spirals and +5 Fisheroo Reset points.','Koi: raises Poppy’s base account bonuses to 2x.','Angler: unlocks 3 Tar Pit upgrades and triples Tartar Fish gain.','Leech: Fishing Buddy gives +50% Bluefin and Shiny Speed per level after level 5.','Aquaray: raises Poppy’s base account bonuses to 2.5x.','Jettison: unlocks the last 2 Tar Pit upgrades and triples Tartar Fish gain again.','Shoal: raises Poppy’s base account bonuses to 3x.','Eel: Shiny Fishing is 1% faster per Tasty Fishbait level.','Marlin: all Bluefin and Tar Pit upgrades are 5% cheaper per King Worm level.','Eclectic: raises Poppy’s base account bonuses to 3.5x; extra copies continue increasing it.']},
    bubba:{label:'Mega Flesh',plural:'Mega Flesh',field:'ownedMegaflesh',prefix:'BubbaMF',count:12,effects:['Meat Slice production gains +1% per total Bubba upgrade level.','Raises every Bubba permanent account bonus by 20%.','Unlocks a second gift choice when resetting Bubba.','Raises every Bubba permanent account bonus by another 20%.','Unlocks the next tier of Bubba gift and progression upgrades.','Unlocks more of Bubba’s dice and gift-progression mechanics.','Raises every Bubba permanent account bonus by another 20%.','Unlocks the Smoker and higher-quality meat progression.','Unlocks the next late-game Bubba progression tier.','Raises every Bubba permanent account bonus by another 20%.','Unlocks the final late-game Bubba progression tier.','Raises every Bubba permanent account bonus by another 20%.']}
  };
  const num=value=>Number.isFinite(Number(value))?Number(value):0;
  const fmt=value=>num(value).toLocaleString(undefined,{maximumFractionDigits:2,notation:Math.abs(num(value))>=1e6?'compact':'standard'});
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function asset(meta,index){return meta.prefix==='OwlFeather'?null:`assets/${meta.prefix}${index}.png`;}
  function rewardImage(meta,index,alt=''){const src=asset(meta,index);return src?`<img src="${src}" alt="${esc(alt)}">`:`<span class="clicker-feather-icon feather-${index}" aria-label="${esc(alt)}"></span>`;}
  function permanentImpact(system,meta,amount){
    const original=system[meta.field];
    try{system[meta.field]=Math.max(0,amount);return num(system.getGlobalBonusMulti?.());}
    catch{return 0;}
    finally{system[meta.field]=original;}
  }
  function renderDetail(detail,system,meta,index,owned){
    const before=permanentImpact(system,meta,index),after=permanentImpact(system,meta,index+1),gain=after-before;
    const status=index<owned?'Collected':index===owned?'Next reward':'Not collected';
    const effect=meta.effects?.[index]||'';
    detail.innerHTML=`<div class="clicker-reward-detail-head">${rewardImage(meta,index,`${meta.label} ${index+1}`)}<div><span>${esc(meta.label)} ${index+1}</span><strong>${esc(status)}</strong></div></div>${effect?`<p><b>Bonus:</b> ${esc(effect)}</p>`:gain>0?`<p><b>Bonus:</b> +${fmt(gain)}% permanent clicker-bonus multiplier.</p>`:''}`;
  }
  function enhance(host,key,rawRoot){
    const meta=cfg[key],page=host.querySelector('.clicker-page'),system=root.BonusSystems.systems(rawRoot).get(key);
    if(!meta||!page||!system)return;
    const grid=page.querySelector('.clicker-reward-grid');
    if(!grid||grid.dataset.rewardDetails==='true')return;
    [...page.querySelectorAll('.clicker-heading')].filter(node=>node.textContent.trim()==='Permanent account bonuses').forEach(heading=>{heading.nextElementSibling?.remove();heading.remove();});
    grid.dataset.rewardDetails='true';
    const owned=num(system[meta.field]);
    const rewards=page.querySelector('.clicker-rewards');
    const detail=document.createElement('section');
    detail.className='clicker-reward-detail';
    [...grid.querySelectorAll(':scope > div')].forEach((tile,index)=>{
      if(index>=meta.count){tile.remove();return;}
      tile.classList.add('clicker-reward-tile');
      tile.setAttribute('role','button');tile.tabIndex=0;
      tile.setAttribute('aria-label',`${meta.label} ${index+1}: show details`);
      const amount=tile.querySelector('strong')?.textContent||'—';
      tile.innerHTML=`${rewardImage(meta,index)}<strong>${esc(amount)}</strong><small>${index+1}</small>`;
      const select=()=>{grid.querySelectorAll('.selected').forEach(node=>node.classList.remove('selected'));tile.classList.add('selected');renderDetail(detail,system,meta,index,owned);};
      tile.addEventListener('click',select);tile.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select();}});
    });
    rewards.append(detail);
    const defaultIndex=Math.min(Math.max(owned-1,0),grid.children.length-1);grid.children[defaultIndex]?.click();
  }
  const prior=root.BonusSystems.render;
  root.BonusSystems={...root.BonusSystems,render(host,key,rawRoot={}){prior(host,key,rawRoot);if(cfg[key])enhance(host,key,rawRoot);}};
})(typeof window!=='undefined'?window:globalThis);
