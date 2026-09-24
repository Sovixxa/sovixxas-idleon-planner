(function(root){'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Number(v).toLocaleString(undefined,{maximumFractionDigits:3});
// Local client: PageReadingLVgains and inventory SPELUNKY_PAGE handler.
// getLOG uses 2.30259, deliberately retained instead of substituting log10.
function gain(pages,multi=1){
 if(!Number.isSafeInteger(pages)||pages<100||!Number.isFinite(multi)||multi<1)return null;
 const base=1+Math.log(pages/100)/Math.log(2)+3*Math.log(pages/100)/2.30259,lo=base*multi,hi=(base+1)*multi;
 const min=Math.floor(lo),max=Math.ceil(hi)-1,distribution=[];
 for(let level=min;level<=max;level++){const chance=Math.max(0,Math.min(hi,level+1)-Math.max(lo,level))/multi;if(chance>0)distribution.push({level,chance});}
 return {min,max,expected:distribution.reduce((sum,x)=>sum+x.level*x.chance,0),distribution};
}
function chances(rows,pages){let remaining=1;const result=rows.map(()=>0);if(pages<100)return result;for(let i=rows.length-1;i>=0;i--){const chance=i===0?1:pages>=rows[i].lore.threshold?Math.min(.5,(rows.length-1-i+.5)/4):0;result[i]=remaining*chance;remaining*=1-chance;}return result;}
function effect(lore,level){const value=lore.func.startsWith('decay')?lore.base*level/(lore.scale+level||1):lore.base*level+lore.scale;return lore.template.replace('{',fmt(value*lore.multi)).replace('}',fmt((value+(lore.func==='decayMulti'?1:0))*lore.multi));}
function levelBreakpoint(level,multi=1){
 const k=1/Math.log(2)+3/2.30259;
 const estimate=100*Math.exp((level/multi-1)/k);
 if(!Number.isFinite(estimate)||estimate>Number.MAX_SAFE_INTEGER)return null;
 let pages=Math.max(100,Math.ceil(estimate));
 while(gain(pages,multi).min<level)pages++;
 while(pages>100&&gain(pages-1,multi).min>=level)pages--;
 return pages;
}
function progressCard(row,name){
 const l=row.lore,decay=l.func.startsWith('decay'),pct=decay?100*l.level/(l.scale+l.level||1):null;
 const heading=decay?'Diminishing returns · No finite hard cap':'Linear · No soft or hard cap';
 return '<article class="lore-progress-card"><div class="lore-progress-heading"><strong>'+esc(name)+'</strong><span>'+heading+'</span></div><p>'+esc(row.effect)+' · '+fmt(l.level)+' saved levels</p><p class="lore-next-level">At level '+fmt(l.level+1)+': '+esc(effect(l,l.level+1))+'</p>'+(decay?
 '<div class="lore-progress-track" role="progressbar" aria-label="'+esc(name)+' scaling ceiling" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"><div style="width:'+pct+'%"></div>'+[50,75,90,95].map(n=>'<i style="left:'+n+'%"></i>').join('')+'</div><p><b>'+fmt(pct)+'% of scaling ceiling</b> · Soft cap: gradual diminishing returns, no fixed cutoff.</p><div class="lore-milestones">'+[50,75,90,95,99].map(n=>'<span>'+n+'% at '+fmt(Math.round(l.scale*n/(100-n)))+' levels</span>').join('')+'</div>':
 '<div class="lore-linear-track" aria-hidden="true"></div><p>Constant gain per level: '+fmt(l.base*l.multi)+'. Continues indefinitely; no cap percentage applies.</p>')+'</article>';
}
function render(host,all){
 const rows=all.filter(x=>x.lore),chapters=[...new Map(rows.map(x=>[x.lore.chapter,x.lore.chapterName])).entries()];if(!rows.length)return;
 let chapter=chapters[0][0];
 const paint=()=>{
  const selected=rows.filter(x=>x.lore.chapter===chapter).sort((a,b)=>a.lore.index-b.lore.index),multi=selected[0].lore.readMulti;
  const thresholds=[...new Set([100,...selected.map(x=>x.lore.threshold)])].sort((a,b)=>a-b);
  const short=x=>x.lore.template.replace(/[{}]/g,'').replace(/^\+?%?\s*/,'').replace(/^x\s*/,'');
  host.className='lore-calculator';
  host.innerHTML='<header><p class="eyebrow">Daily Lore · Reading guide</p><h2>Pages → bonus levels</h2><p>One daily read consumes the entire page stack. One eligible chapter bonus is randomly chosen and receives the calculated levels.</p></header>'+
   '<p class="lore-note">Your page-level multiplier: <strong>'+fmt(multi)+'×</strong>. Daily limit: 5 reads, or 8 with Spelunking mastery. '+(selected[0].lore.usedReads===null?'Reads used are unavailable.':'Reads used in this save: '+fmt(selected[0].lore.usedReads)+'.')+'</p>'+
   '<div class="lore-controls"><label>Chapter <select id="loreChapter">'+chapters.map(([id,name])=>'<option value="'+id+'" '+(id===chapter?'selected':'')+'>'+esc(name)+'</option>').join('')+'</select></label></div>'+
   '<div class="lore-chapter-heading"><img src="'+esc(selected[0].icon)+'" alt="'+esc(selected[0].lore.chapterName)+' lore page"><div><h3>'+esc(selected[0].lore.chapterName)+'</h3><p>'+selected.length+' bonuses · '+fmt(selected.reduce((sum,x)=>sum+x.lore.level,0))+' total saved levels</p></div></div>'+
   '<h3>Bonus-selection breakpoints</h3><p class="lore-note">These are the actual page requirements for this chapter. Higher bonuses are rolled first: 12.5%, then 37.5%, then 50%; the first bonus gets the remaining chance. A bonus below its page requirement is skipped.</p><div class="lore-table-wrap"><table><thead><tr><th>Pages per read</th><th>Possible bonus levels per read</th><th>Resulting selection chances</th></tr></thead><tbody>'+
   thresholds.map(p=>{const g=gain(p,multi),prob=chances(selected,p);return '<tr><th>'+fmt(p)+'</th><td>+'+g.min+(g.max!==g.min?' to +'+g.max:'')+'<span>'+g.distribution.map(x=>'+'+x.level+': '+fmt(x.chance*100)+'%').join(' · ')+'</span></td><td>'+selected.map((x,i)=>prob[i]?esc(short(x))+': <b>'+fmt(prob[i]*100)+'%</b>':'').filter(Boolean).join('<br>')+'</td></tr>';}).join('')+'</tbody></table></div>'+
   '<details class="lore-formula"><summary>Level-gain breakpoints from the formula</summary><p>Smallest whole page stack that guarantees each level gain, even on the lowest random roll. These use your current page-level multiplier; a random roll can award more. Larger stacks always cost more pages for diminishing gains.</p><div class="lore-table-wrap"><table><thead><tr><th>Guaranteed levels L</th><th>Minimum pages</th><th>Possible levels per read</th></tr></thead><tbody>'+
   Array.from({length:50},(_,i)=>i+1).map(level=>{const p=levelBreakpoint(level,multi);if(p===null)return '';const g=gain(p,multi);return '<tr><th>+'+level+'</th><td>'+fmt(p)+'</td><td>+'+g.min+(g.max!==g.min?'–'+g.max:'')+'</td></tr>';}).join('')+'</tbody></table></div></details>'+
   '<h3>Bonus progress & scaling</h3><p class="lore-note">Progress uses saved bonus levels. Diminishing-return bars show the share of the scaling ceiling reached; milestone markers are reference points, not hard caps.</p><div class="lore-progress-list">'+selected.map(x=>progressCard(x,short(x))).join('')+'</div>';
  host.querySelector('#loreChapter').onchange=e=>{chapter=Number(e.target.value);paint();host.querySelector('#loreChapter').focus();};
 };paint();
}
root.DailyLore={render,gain,chances,effect,levelBreakpoint};
})(typeof window==='undefined'?globalThis:window);
