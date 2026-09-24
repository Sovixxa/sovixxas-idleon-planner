/* Saved Construction layout: CogO[0..95] = 12x8 board, [96..107] =
 * cog production, [108..227] = shelf, [228..251] = small cog rails.
 * CogM keys are the game's CogMapKeys; FlagU=-11 means unlocked. */
(function(root){
  'use strict';
  const parse=v=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{return v;}}return v;};
  const obj=v=>{const p=parse(v);return p?.h&&typeof p.h==='object'?p.h:p;};
  const labels={a:'Build rate / hour',b:'Saved player EXP / hour',c:'Flag rate / hour',d:'Bonus Construction EXP',e:'Build rate boost',f:'Player Construction EXP boost',g:'Flag rate boost',j:'Speed to flags',k:'No effect',tinyFlag:'Total flag rate bonus',tinyBuild:'Total build rate bonus',tinyExp:'Total Construction EXP bonus'};
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
    const gems=obj(data.GemItemsPurchased??account.gemShopPurchases),gemFlag=Number(gems?.[118]);
    return {available:order!=null,slots,board:slots.slice(0,96),production:slots.slice(96,108),shelf:slots.slice(108,228),left:slots.slice(228,240),right:slots.slice(240,252),placed:placed.size,gemFlagKnown:gems?.[118]!=null&&Number.isFinite(gemFlag),flagMultiplier:1+(Number.isFinite(gemFlag)?Math.max(0,gemFlag)*0.5:0)};
  }
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:1,notation:Math.abs(Number(n))>=10000?'compact':'standard'});
  const tileNumber=n=>Math.abs(Number(n))>=1e15?Number(n).toExponential(1):Number(n).toLocaleString(undefined,{notation:Math.abs(Number(n))>=1000?'compact':'standard',maximumFractionDigits:1});
  function optimize(model,objective='exp',time=1200){
    const engine=root.CogOptimizer||(typeof require==='function'?require('./cog-optimizer-engine'):null);
    if(!engine)throw new Error('Cog optimizer failed to load. Refresh the page and try again.');
    return engine.optimize(model,objective,time);
  }
  function render(host,data,account){
    const model=decode(data,account),assets=new Set(root.COG_ASSETS||[]);
    if(!model.available){host.innerHTML='<p class="muted">This export has no cog layout. Load a full account export to see your saved board.</p>';return;}
    host.cogWorker?.terminate();
    let metric='f',objective='exp',shelfPage=0,busy=false,status='Ready',proposal=optimize(model,'exp',0),runId=0,step=0;
    const sprite=s=>assets.has(s.item+'.png')?s.item+'.png':s.isPlayer&&assets.has('ClassIcons'+s.classId+'.png')?'ClassIcons'+s.classId+'.png':null;
    const title=s=>s.isPlayer?s.name:/^CogZA0[0-3]$/.test(s.item)?'Yin · '+['top left','top right','bottom left','bottom right'][Number(s.item.slice(-1))]:s.item==='CogY'?'Yang Cog':s.empty?(s.locked?'Locked tile':'Empty tile'):/^CogCry\d$/.test(s.item)?['Topaz','Ruby','Amethyst','Garnet','Emerald','Bluegem'][Number(s.item.slice(-1))]+' Cog':s.item.replace(/^Cog/,'Cog ');
    const value=s=>s.isPlayer?`Lv ${s.level??'?'}`:s.empty?'':s.stats[metric]!=null?fmt(s.stats[metric])+(percent.has(metric)?'%':''):s.statsKnown?'0'+(percent.has(metric)?'%':''):'?';
    function tile(s,small=false){const art=sprite(s);return `<button type="button" class="cog-slot ${small?'cog-small':''} ${s.empty?'is-empty':''} ${s.empty&&s.locked?'is-locked':''} ${s.isPlayer?'is-character':''}" data-cog-slot="${s.index}" title="${esc(title(s))} · ${esc(s.zone)} ${s.index<96?`Row ${'ABCDEFGH'[Math.floor(s.index/12)]} C${s.index%12+1}`:''}" aria-label="${esc(title(s))}, ${esc(s.zone)} slot ${s.index+1}">${art&&!s.empty?`<img src="assets/${art}" alt="">`:s.empty&&s.locked?'<span class="cog-lock">×</span>':''}${s.flag?'<span class="cog-flag">⚑</span>':''}${!small?`<small>${esc(value(s))}</small>`:''}</button>`;}
    const coordinate=index=>index<96?`${'ABCDEFGH'[Math.floor(index/12)]}${index%12+1}`:`Shelf P${Math.floor((index-108)/15)+1} · slot ${(index-108)%15+1}`;
    function paint(){
      const working=model.slots.slice();
      for(const move of proposal.moves.slice(0,step))[working[move.from],working[move.to]]=[working[move.to],working[move.from]];
      const active=proposal.moves[step];
      const workingRates=step?root.CogOptimizer.evaluate(model,working).rates:proposal.ratesBefore;
      host.innerHTML=`<div class="cog-toolbar"><div><strong>${step?'Your progress board':'Current saved layout'}</strong><small>${step?`${step} swaps marked done · preview only`:'Loaded JSON · 12 × 8 board'}</small></div><label>Show <select id="cogMetric"><optgroup label="Effective rates"><option value="a">Build / hour · buffed</option><option value="c">Flaggy / hour · buffed</option><option value="b">Player EXP / hour · buffed</option></optgroup><optgroup label="Buffs received"><option value="e">Build boosts received %</option><option value="f">Player EXP boosts received %</option><option value="g">Flaggy boosts received %</option><option value="j">Local flag-speed boosts %</option></optgroup><option value="d">Own global EXP bonus %</option></select></label></div><div class="cog-workbench"><section class="cog-board-wrap" aria-label="Saved cog board"><div class="cog-rail">${model.left.map(s=>tile(s,true)).join('')}</div><div class="cog-main-board">${working.slice(0,96).map(s=>tile(s)).join('')}</div><div class="cog-rail">${model.right.map(s=>tile(s,true)).join('')}</div></section><p class="cog-hint">Follow the highlighted swap here. Blue = pick up; amber = drop onto. The board advances when you mark a swap done.</p><details class="cog-shelf-panel"><summary>Cog shelf · ${working.slice(108,228).filter(s=>!s.empty).length} stored · own stats</summary><div class="cog-shelf-controls"><button id="cogPrev" ${shelfPage===0?'disabled':''}>‹</button><span>Page ${shelfPage+1} / 8</span><button id="cogNext" ${shelfPage===7?'disabled':''}>›</button></div><div class="cog-shelf-grid">${working.slice(108+shelfPage*15,108+shelfPage*15+15).map(s=>tile(s)).join('')}</div></details><details class="cog-production-panel"><summary>Characters making cogs · ${model.production.filter(s=>s.isPlayer).length}</summary><div class="cog-production-grid">${model.production.map(s=>`<div>${tile(s)}<span>${s.isPlayer?esc(s.name):'Empty'}<small>${['Basic','Decent','Superb','Ultimate'][Math.floor((s.index-96)/3)]}</small></span></div>`).join('')}</div></details></div><section id="cogDetail" class="exp-card cog-detail" hidden aria-live="polite"></section>`;
      const optimizer=document.createElement('section');optimizer.className='exp-card cog-optimizer';
      optimizer.innerHTML=`<div class="cog-toolbar"><div><strong>Optimized ${objective==='exp'?'EXP':objective==='flag'?'flaggy rate':'build rate'} layout</strong><small>${esc(status)} · ${proposal.moves.length} suggested swaps</small></div><label>Optimize for <select id="cogObjective" ${step>0?'disabled':''}><option value="exp">EXP</option><option value="flag">Flaggy rate</option><option value="build">Build rate</option></select></label><button type="button" id="cogOptimize" ${busy||step>0?'disabled':''}>${busy?'Optimizing…':'Optimize'}</button></div><div class="cog-workbench cog-optimized-workbench"><section class="cog-board-wrap" aria-label="Suggested cog board"><div class="cog-rail">${model.left.map(s=>tile(s,true)).join('')}</div><div class="cog-main-board cog-preview">${proposal.board.map((s,index)=>tile(s).replace('class="cog-slot ',`class="cog-slot ${s.index!==index?'cog-changed ':''}`).replace('title="',`title="Suggested row ${'ABCDEFGH'[Math.floor(index/12)]}, column ${index%12+1} · `)).join('')}</div><div class="cog-rail">${model.right.map(s=>tile(s,true)).join('')}</div></section><p class="cog-hint">Green outlines mark replacements. Hover or select a cog to see its buff connections.</p></div><div id="cogProposal" aria-live="polite"></div><details class="cog-optimizer-scope"><summary>What this optimizer includes</summary><p>Searches board and shelf cogs, including directional and special cogs. Accounts for surrounding build, flaggy, and player EXP boosts; assembled Excogia squares move together. Production, small cog rails, locked tiles and tiles without usable data stay in place.</p><p>Rates use saved character bonuses and the viewed board’s directional buffs. Saved player EXP is adjusted for the change in buffs, not multiplied twice. The gem-shop flag multiplier is included when available; tiny-cog effects already stored in character rates are not applied again. EXP falls back to board bonus when player rates are missing. Flaggy rate excludes local flag-unlock speed. Search finds an improved layout, not a guaranteed global optimum. Follow swaps in order in game, then import a new save.</p></details>`;
      const legend=document.createElement('div');legend.className='cog-buff-legend';
      legend.innerHTML='<span class="cog-legend-target">Teal: tiles this cog boosts</span><span class="cog-legend-source">Purple: cogs boosting this tile</span><span>Overlapping percentages add together. They multiply base rates, not the strength of other buffs. Player EXP boosts benefit characters.</span>';
      const comparison=document.createElement('div');comparison.className='cog-comparison';
      const current=document.createElement('section');current.className='cog-current';
      current.append(host.querySelector('.cog-toolbar'),host.querySelector('.cog-workbench'));
      comparison.append(current,optimizer);host.prepend(legend,comparison);
      comparison.querySelectorAll('.cog-main-board').forEach(grid=>{
        const tiles=Array.from(grid.children),number=(text,label)=>{const el=document.createElement('span');el.className='cog-coordinate';el.textContent=text;el.setAttribute('aria-label',label);return el;};
        grid.replaceChildren(number('','Grid coordinates'));
        for(let column=1;column<=12;column++)grid.append(number(String(column),`Column ${column}`));
        tiles.forEach((button,index)=>{
          const row='ABCDEFGH'[Math.floor(index/12)],column=index%12+1;
          if(column===1)grid.append(number(String(row),`Row ${row}`));
          button.dataset.cogPosition=String(index);
          button.title=`Row ${row}, column ${column} · ${title(model.slots[Number(button.dataset.cogSlot)])}`;
          button.setAttribute('aria-label',`Row ${row}, column ${column}: ${button.getAttribute('aria-label')}`);
          grid.append(button);
        });
      });
      const yin=proposal.excogiaAfter;
      if(yin?.pieces.some(count=>count>0)){
        const notice=document.createElement('section');notice.className='cog-excogia-summary';
        notice.innerHTML=`<strong>Yin / Excogia: ${proposal.excogiaBefore.sets.length} → ${yin.sets.length} assembled sets</strong><p>Four matching pieces must form a 2 × 2 square in this order. Each complete set gives characters +80% player EXP boost and +5% build boost, added to other incoming buffs. Separate completed sets do not need to touch; their buffs cover the whole board.</p><div class="cog-excogia-plans">${yin.sets.map((positions,index)=>`<div><strong>Set ${index+1} · final positions</strong><div class="cog-excogia-grid">${positions.map((position,piece)=>`<span><img src="assets/CogZA0${piece}.png" alt="${['Top left','Top right','Bottom left','Bottom right'][piece]} Yin piece"><b>${coordinate(position)}</b></span>`).join('')}</div></div>`).join('')||'<span>No complete set in this layout.</span>'}</div>${!busy&&yin.completeSetsOwned>yin.sets.length?'<p>Some owned pieces remain unassembled. The search could not fit an additional complete set without reducing the selected objective or moving protected tiles.</p>':yin.completeSetsOwned===0?'<p>A complete set needs one of each of the four different pieces.</p>':''}`;
        optimizer.insertBefore(notice,optimizer.querySelector('#cogProposal'));
      }
      current.querySelectorAll('.cog-shelf-grid .cog-slot').forEach((button,index)=>{button.dataset.cogPosition=String(108+shelfPage*15+index);});
      if(proposal){
        const results=optimizer.querySelector('#cogProposal');
        results.innerHTML=`<p role="status" id="cogSearchStatus">${esc(status)}</p><table class="cog-totals"><thead><tr><th>Board estimate</th><th>Saved layout</th><th>Suggested</th></tr></thead><tbody>${[['build','Build / hour'],['flag','Flaggy / hour'],[proposal.expKey==='totalExpRate'?'bonus':'exp',proposal.expKey==='totalExpRate'?'EXP bonus %':'Player EXP / hour']].map(([key,label])=>`<tr><th>${label}</th><td>${fmt(proposal.totalsBefore[key])}</td><td>${fmt(proposal.totalsAfter[key])}</td></tr>`).join('')}</tbody></table>${proposal.warnings?.length?`<p class="cog-data-warning">${proposal.warnings.map(esc).join(' ')}</p>`:''}<details class="cog-optimizer-scope"><summary>Bonus breakdown</summary><p>Gem-shop flag multiplier: ×${fmt(model.flagMultiplier)}${model.gemFlagKnown?'':' (bonus unavailable)'}. Raw cog EXP bonus: ${fmt(proposal.totalsBefore.rawBonus)}% → ${fmt(proposal.totalsAfter.rawBonus)}%. In-game displayed EXP bonus, including tiny XP cogs: ${fmt(proposal.totalsBefore.bonus)}% → ${fmt(proposal.totalsAfter.bonus)}%.</p>${proposal.flagsBefore?.length?`<p>Current flag locations · hourly unlock progress</p><ul>${proposal.flagsBefore.map((flag,index)=>`<li>${flag.index<96?coordinate(flag.index):`${flag.index<240?'Left':'Right'} rail ${(flag.index-228)%12+1}`}: ${fmt(flag.rate)} → ${fmt(proposal.flagsAfter[index].rate)}</li>`).join('')}</ul>`:''}</details>${!proposal.moves.length?`<p>${busy?'Searching for improvements…':'No improving swaps found for this objective. Current layout retained.'}</p>`:''}`;
      }
      if(proposal.moves.length){
        const guide=document.createElement('section');guide.className='cog-guide';guide.setAttribute('aria-label','Guided cog swaps');
        const card=(slot,position,label,kind)=>`<div class="cog-step-card ${kind}"><span class="cog-step-label">${label}</span><strong>${esc(coordinate(position))}</strong><div class="cog-step-item">${sprite(slot)?`<img src="assets/${sprite(slot)}" alt="">`:''}<span>${esc(title(slot))}<small>${fmt(slot.stats.d??0)}% EXP · ${fmt(slot.stats.a??0)} build · ${fmt(slot.stats.c??0)} flags</small></span></div></div>`;
        guide.innerHTML=`<div class="cog-guide-heading"><strong>${active?`Swap ${step+1} of ${proposal.moves.length}`:'All swaps marked done'}</strong><span>${step} / ${proposal.moves.length} complete</span></div><progress max="${proposal.moves.length}" value="${step}" aria-label="Completed swaps"></progress>${active?`<div class="cog-step-route">${card(working[active.from],active.from,'1 · Pick up','cog-source-card')}<span class="cog-step-arrow" aria-hidden="true">→</span>${card(working[active.to],active.to,'2 · Drop onto','cog-target-card')}</div>`:'<p>Your progress board now matches the suggested layout. Import a fresh save after making these swaps in game.</p>'}<div class="cog-guide-actions"><button type="button" id="cogStepBack" ${step===0?'disabled':''}>Back one swap</button>${active?'<button type="button" id="cogStepNext">Done in game · Next →</button>':''}</div><p class="cog-guide-note">${step?'To go back, undo the last swap in game too. ':'Make this swap in game, then press Done. '}This guide tracks your steps; it does not change your game.${active&&[active.incoming,active.outgoing].some(s=>/^CogZA0[0-3]$/.test(s.item))?' Yin pieces may be split during these swaps; use the final 2 × 2 set diagram to check the finished placement.':''}${step?' Import a new save before starting another optimization.':''}</p>`;
        host.insertBefore(guide,comparison);
        const advance=delta=>{step+=delta;const move=proposal.moves[step];if(move?.from>=108)shelfPage=Math.floor((move.from-108)/15);paint();host.querySelector(delta>0?'#cogStepNext':'#cogStepBack')?.focus({preventScroll:true});};
        guide.querySelector('#cogStepBack').onclick=()=>advance(-1);
        if(active)guide.querySelector('#cogStepNext').onclick=()=>advance(1);
        if(active){
          const mark=(position,kind,label)=>{
            let button;
            if(position<96)button=current.querySelectorAll('.cog-main-board .cog-slot')[position];
            else{const offset=position-108-shelfPage*15;if(offset>=0&&offset<15)button=current.querySelectorAll('.cog-shelf-grid .cog-slot')[offset];}
            if(button){button.classList.add(kind);const badge=document.createElement('span');badge.className='cog-step-badge';badge.textContent=label;button.append(badge);button.setAttribute('aria-label',label+': '+coordinate(position)+', '+button.getAttribute('aria-label'));}
          };
          mark(active.from,'cog-step-source','1');mark(active.to,'cog-step-target','2');
          if(active.from>=108)current.querySelector('.cog-shelf-panel').open=true;
        }
      }
      optimizer.querySelector('#cogObjective').value=objective;
      optimizer.querySelector('#cogObjective').onchange=e=>{objective=e.target.value;metric=objective==='exp'?'f':objective==='flag'?'c':'a';run();};
      optimizer.querySelector('#cogOptimize').onclick=run;

      host.querySelector('#cogMetric').value=metric;
      host.querySelector('#cogMetric').onchange=e=>{metric=e.target.value;paint();};
      host.querySelector('#cogPrev').onclick=()=>{shelfPage--;paint();host.querySelector('.cog-shelf-panel').open=true;};
      host.querySelector('#cogNext').onclick=()=>{shelfPage++;paint();host.querySelector('.cog-shelf-panel').open=true;};
      let pinned=null;
      const clearConnections=()=>host.querySelectorAll('.cog-buff-selected,.cog-buff-source,.cog-buff-target').forEach(el=>el.classList.remove('cog-buff-selected','cog-buff-source','cog-buff-target'));
      const showConnections=(button,rate)=>{clearConnections();const grid=button.closest('.cog-main-board');if(!grid)return;const tiles=grid.querySelectorAll('.cog-slot');button.classList.add('cog-buff-selected');rate.targets?.forEach(index=>tiles[index]?.classList.add('cog-buff-target'));rate.sources?.forEach(index=>tiles[index]?.classList.add('cog-buff-source'));};
      const restoreConnections=()=>{if(pinned)showConnections(pinned.button,pinned.rate);else clearConnections();};
      host.querySelectorAll('[data-cog-slot]').forEach(button=>{
        const s=model.slots[Number(button.dataset.cogSlot)];
        const position=Number(button.dataset.cogPosition??s.index),preview=!!button.closest('.cog-preview'),rate=position<96?(preview?proposal.ratesAfter:workingRates)?.[position]:null;
        const stats=rate?Object.fromEntries(Object.entries(rate.stats).map(([key,v])=>[key,key==='h'?v:key==='b'?s.stats.b:v.value])):s.stats;
        const bonuses=Object.entries(labels).filter(([key])=>stats[key]!=null).map(([key,label])=>`${label}: ${fmt(stats[key])}${percent.has(key)?'%':''}`);
        button.title += bonuses.length?'\n'+bonuses.join('\n'):'';
        if(stats.h)button.title+='\nTargets: '+stats.h;
        if(rate){
          const received={e:'build',f:'exp',g:'flag',j:'flagSpeed'},effective={a:'build',b:'exp',c:'flag'};
          const text=received[metric]? tileNumber(rate.boosts[received[metric]])+'%':effective[metric]?metric==='b'&&!s.isPlayer?'—':!s.statsKnown&&!s.empty?'?':tileNumber(rate[effective[metric]]):s.empty?'':fmt(stats.d??0)+'%';
          button.querySelector('small').textContent=text;
          button.title+='\nEffective: '+fmt(rate.build)+' build/h · '+fmt(rate.flag)+' flaggy/h'+(s.isPlayer?' · '+fmt(rate.exp)+' EXP/h':'');
          button.title+='\nReceives: +'+fmt(rate.boosts.build)+'% build · +'+fmt(rate.boosts.exp)+'% player EXP · +'+fmt(rate.boosts.flag)+'% flaggy';
          const shape={row:'↔',column:'↕',up:'↑',down:'↓',left:'←',right:'→',adjacent:'+',diagonal:'×',corners:'⋄',around:'◎',everything:'✦'}[stats.h];
          if(shape&&rate.targets?.length){const badge=document.createElement('span');badge.className='cog-shape-badge';badge.textContent=shape;badge.setAttribute('aria-label',stats.h+' buff');button.append(badge);}
          button.onmouseenter=()=>showConnections(button,rate);
          button.onmouseleave=()=>restoreConnections();
          button.onfocus=()=>showConnections(button,rate);
          button.onblur=()=>restoreConnections();
        }
        button.onclick=()=>{
          pinned=rate?{button,rate}:null;restoreConnections();
          const panel=host.querySelector('#cogDetail');panel.hidden=false;
          panel.innerHTML=`<button id="cogClose" class="secondary" aria-label="Close cog details">Close</button><h3>${esc(title(s))}</h3><p class="muted">${preview?'Suggested layout':step?'Progress layout':'Saved layout'} · ${position<96?coordinate(position):esc(s.zone)}</p>${s.isPlayer?`<p>Construction level: <strong>${s.level??'Unavailable'}</strong></p>`:''}${s.empty?`<p>${s.locked===null?'Unlock status unavailable.':s.locked?'Place a flag here in game to unlock this tile.':'Unlocked and empty.'}</p>`:`${bonuses.length?`<dl>${Object.entries(labels).filter(([key])=>stats[key]!=null).map(([key,label])=>`<div><dt>${label}</dt><dd>${fmt(stats[key])}${percent.has(key)?'%':''}</dd></div>`).join('')}</dl>`:'<p>Individual stats are not present in this export.</p>'}${stats.h?`<p><strong>Boost targets:</strong> ${esc(stats.h)}</p>`:''}`}${rate?`<h4>Effective rates at ${coordinate(position)}</h4><dl><div><dt>Build / hour</dt><dd>${fmt(rate.build)}</dd></div><div><dt>Flaggy / hour</dt><dd>${fmt(rate.flag)}</dd></div>${s.isPlayer?`<div><dt>Player EXP / hour</dt><dd>${fmt(rate.exp)}</dd></div>`:''}</dl><p>Incoming buffs: +${fmt(rate.boosts.build)}% build · +${fmt(rate.boosts.exp)}% player EXP · +${fmt(rate.boosts.flag)}% flaggy · +${fmt(rate.boosts.flagSpeed)}% local flag speed.</p>`:''}<p class="muted">Individual stats above are saved rates and this layout’s active special-cog bonuses. Effective rates include surrounding buffs. Import a new JSON after changing your game.</p>`;
          if(rate){
            const contributions=document.createElement('section');contributions.className='cog-buff-breakdown';
            const viewRates=preview?proposal.ratesAfter:workingRates;
            const outgoing=source=>[['e','build'],['f','player EXP'],['g','flaggy'],['j','flag speed']].filter(([key])=>(source.stats[key]?.value||0)>0).map(([key,label])=>'+'+fmt(source.stats[key].value)+'% '+label).join(' · ');
            contributions.innerHTML=`<h4>Gives to other tiles</h4><p>${rate.targets.length?esc(outgoing(rate))+' · '+esc(stats.h)+' · '+rate.targets.length+' tiles':'No active directional buff.'}</p><h4>Receives from ${rate.sources.length} cogs</h4><div class="cog-buff-contributors">${rate.sources.map(index=>`<span><strong>${coordinate(index)}</strong> ${esc(outgoing(viewRates[index]))}</span>`).join('')||'<span>No incoming buffs.</span>'}</div>`;
            panel.insertBefore(contributions,panel.querySelector('h3').nextSibling);
          }
          host.querySelector('#cogClose').onclick=()=>{panel.hidden=true;pinned=null;clearConnections();};
        };
      });
    }
    function run(){
      step=0;const id=++runId;host.cogWorker?.terminate();busy=true;status='Optimizing…';proposal=optimize(model,objective,0);paint();
      const finish=result=>{if(id!==runId)return;host.cogWorker?.terminate();busy=false;proposal=result;if(result.moves[0]?.from>=108)shelfPage=Math.floor((result.moves[0].from-108)/15);status='Optimization complete';paint();};
      const fail=error=>{if(id!==runId)return;host.cogWorker?.terminate();busy=false;status='Optimization failed: '+error;paint();};
      try{
        const worker=new Worker('cog-optimizer-worker.js');host.cogWorker=worker;
        worker.onmessage=({data})=>{if(id!==runId)return;if(data.result)finish(data.result);else if(data.error)fail(data.error);else if(data.progress){const el=host.querySelector('#cogSearchStatus');if(el)el.textContent='Optimizing… '+Math.min(100,Math.round(100*data.progress.elapsed/data.progress.budget))+'%';}};
        worker.onerror=()=>fail('Unable to load the search worker. Refresh and retry.');
        worker.postMessage({model,objective});
      }catch(error){fail(error.message);}
    }
    paint();run();
  }
  const api={decode,render,optimize};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CogBoard=api;
})(typeof window!=='undefined'?window:globalThis);
