(function(root){
'use strict';
root.ReviewImpactUI=function(raw,esc,fmt,repaint){
 const selected=new Set();let character=0,includeLevels=false,result=null,error='',worker=null,busy=false,lastGoal,surface,timer;
 const names=Array.isArray(raw.charNames)?raw.charNames:[];
 function reset(){clearTimeout(timer);worker?.terminate();worker=null;busy=false;result=null;error='';}
 function sync(goal,actions){if(lastGoal!==goal){reset();selected.clear();lastGoal=goal;}for(const id of selected)if(!actions.some(a=>a.id===id)){selected.delete(id);reset();}}
 function html(goal,actions){
  sync(goal,actions);if(goal==='unlock'||!names.length||!actions.some(a=>a.preview))return '';
  const delta=result?result.after-result.before:0;
  // Match the game's compact notation: K/M/B/T/Q/QQ, then E notation.
  const total=v=>{const n=Math.abs(v),sign=v<0?'-':'';if(!Number.isFinite(n))return 'Unavailable';if(n<1000)return fmt(v);if(n>=1e21){const exponent=Math.floor(Math.log10(n));return sign+(Math.floor(n/10**exponent*100)/100)+'E'+exponent;}const tier=Math.floor(Math.log10(n)/3),scaled=n/1000**tier,precision=scaled<10?100:scaled<100?10:1;return sign+(Math.ceil(scaled*precision)/precision)+['','K','M','B','T','Q','QQ'][tier];};
  const percent=v=>Math.abs(v)>=.000001?String(Number(v.toFixed(6))):v.toExponential(2);
  return `<section class="review-impact" aria-label="Goal impact preview"><h3>What would these upgrades do?</h3><p>Select upgrades below to compare their combined effect.</p><div class="review-impact-controls"><label>Character <select aria-label="Impact character">${names.map((n,i)=>`<option value="${i}" ${i===character?'selected':''}>${esc(n)}</option>`).join('')}</select></label><button class="secondary" data-impact-all>Select all shown</button><button class="secondary" data-impact-clear>Clear</button><button data-impact-calculate ${!selected.size||busy?'disabled':''}>${busy?'Calculating…':'Calculate impact ('+selected.size+')'}</button></div><label class="review-impact-levels"><input type="checkbox" data-impact-levels ${includeLevels?'checked':''}> Also buy newly unlocked stamp levels (extra coins required)</label><div role="status" aria-live="polite">${error?`<p>${esc(error)}</p>`:result?`<p><strong>${esc(result.label)}</strong></p><p class="review-change" title="${esc(result.before)} → ${esc(result.after)}">${total(result.before)}${esc(result.unit)} → ${total(result.after)}${esc(result.unit)}</p><p class="review-action-benefit">${delta===0?'No modeled change to this total':`${delta>0?'+':''}${total(delta)}${esc(result.unit)}${result.relative===null?'':` · ${result.relative>0?'+':''}${percent(result.relative)}% relative change`}`}</p>${delta!==0&&total(result.before)===total(result.after)?'<p>The increase is smaller than the displayed precision; the gain above shows the difference.</p>':''}<p>${esc(result.note||'')}</p>${delta===0?'<p>The bonus may be capped, conditional, or affect another stat. Cap payments alone add no bonus.</p>':''}`:''}</div><small>Model estimate using reconstructed primary stats, saved gear and talents; the baseline may differ from your in-game sheet. Upgrades are calculated together. Costs are not deducted, so this is not a jointly funded shopping list.</small></section>`;
 }
 function pick(item,goal){return item.preview&&goal!=='unlock'?`<label class="review-impact-pick"><input type="checkbox" data-impact-pick="${esc(item.id)}" ${selected.has(item.id)?'checked':''}> Include in impact preview</label>`:'';}
 function bind(host,goal,actions,page){
  surface=host.querySelector('.account-review');
  host.querySelectorAll('[data-impact-pick]').forEach(input=>input.onchange=()=>{reset();if(input.checked)selected.add(input.dataset.impactPick);else selected.delete(input.dataset.impactPick);repaint();});
  const on=(selector,event,fn)=>{const el=host.querySelector(selector);if(el)el[event]=()=>fn(el);};
  on('[aria-label="Impact character"]','onchange',el=>{character=Number(el.value);reset();repaint();});
  on('[data-impact-levels]','onchange',el=>{includeLevels=el.checked;reset();repaint();});
  on('[data-impact-all]','onclick',()=>{reset();actions.slice(page*6,page*6+6).filter(a=>a.preview).forEach(a=>selected.add(a.id));repaint();});
  on('[data-impact-clear]','onclick',()=>{reset();selected.clear();repaint();});
  on('[data-impact-calculate]','onclick',()=>{
   reset();busy=true;const current=worker=new Worker('account-review-impact-worker.js');
   const upgrades=actions.filter(a=>selected.has(a.id)).map(a=>a.preview);repaint();
   timer=setTimeout(()=>finish({error:'The preview timed out. Try fewer upgrades.'}),60000);
   function finish(data){clearTimeout(timer);current.terminate();if(worker!==current)return;worker=null;busy=false;result=data.result||null;error=data.error||'';if(surface?.isConnected)repaint();}
   current.onmessage=e=>finish(e.data);current.onerror=()=>finish({error:'The impact calculator could not load.'});
   current.postMessage({raw,actions:upgrades,character,goal,includeLevels});
  });
 }
 return {html,pick,bind,sync};
};
})(window);
