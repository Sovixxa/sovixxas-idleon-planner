(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pretty=root.DashboardModel.pretty;
const assets=root.DashboardAssets||{},nav=Object.fromEntries(Object.keys(assets).filter(k=>k.startsWith('nav-')).map(k=>[k.slice(4).toLowerCase(),assets[k]]));
const aliases={shops:'Tasks',laboratory:'Lab',etc:'Events',owl:'Orion',kangaroo:'Poppy',materialTracker:'Storage',closestTrap:'Trapping',closestSalt:'Refinery',library:'Construction'};
function system(row){return nav[(aliases[row.key]||row.page||row.key).toLowerCase()]||nav.dailies;}
function image(src){return src?`<span class="tracker-art"><img src="${esc(src)}" alt="" loading="lazy" width="34" height="34"></span>`:'';}
function render(data,itemNames={},fallback){
 const byName=new Map(Object.entries(itemNames).map(([k,v])=>[pretty(v).toLowerCase(),k]));
 const label=v=>itemNames[v]||pretty(v);
 const format=v=>typeof v==='boolean'?(v?'Ready':'No'):v!==''&&v!=null&&Number.isFinite(Number(v))?Number(v).toLocaleString(undefined,{maximumFractionDigits:2}):label(v);
 const isObject=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const internal=k=>/raw.?name$/i.test(k)||/^(?:index|mapIndex|icon|image)$/i.test(k);
 const identity=v=>v.displayName||v.name||v.item?.displayName||v.item?.name||v.rawName||v.item?.rawName||v.saltName||v.character;
 const icon=v=>{const key=v.rawName||v.item?.rawName||byName.get(pretty(identity(v)||'').toLowerCase());return assets[key]||fallback;};
 function record(v){
  const title=identity(v),quantity=v.amount??v.quantityOwned??v.quantity??v.count;
  const rest=Object.entries(v).filter(([k,x])=>x!=null&&!internal(k)&&!['name','displayName','rawName','item','shopName','index','icon','image','amount','quantityOwned','quantity','count'].includes(k)&&!(k==='character'&&title===v.character));
  return `<div class="tracker-item-row">${image(icon(v))}<div class="tracker-item-info"><strong>${esc(label(title||'Details'))}</strong>${v.text?`<p>${esc(v.text)}</p>`:''}${rest.filter(([k,x])=>k!=='text'&&typeof x!=='object').map(([k,x])=>`<span class="tracker-inline-stat">${esc(pretty(k))} <b>${esc(format(x))}</b></span>`).join('')}${rest.filter(([,x])=>typeof x==='object').map(([k,x])=>section(k,x)).join('')}</div>${quantity!=null?`<strong class="tracker-item-quantity" title="Quantity">${esc(format(quantity))}<small>${v.shopName?'in stock':'quantity'}</small></strong>`:''}</div>`;
 }
 function section(key,v){return `<section class="tracker-detail-section"><h4>${esc(pretty(key))}</h4>${draw(v)}</section>`;}
 function draw(v){
  if(v==null)return '';
  if(Array.isArray(v)){
   const list=v.flat(Infinity).filter(x=>x!=null);
   if(!list.length)return '<p class="tracker-detail-muted">None in this save</p>';
   if(list.every(x=>isObject(x)&&x.shopName))return [...new Set(list.map(x=>x.shopName))].map(shop=>`<section class="tracker-shop-group"><h4>${esc(pretty(shop))}<span>${list.filter(x=>x.shopName===shop).length} items</span></h4>${list.filter(x=>x.shopName===shop).map(record).join('')}</section>`).join('');
   return `<div class="tracker-item-list">${list.map(x=>isObject(x)?identity(x)?record(x):draw(x):`<div class="tracker-simple-row">${image(assets[x]||assets[byName.get(pretty(x).toLowerCase())])}<span>${esc(format(x))}</span></div>`).join('')}</div>`;
  }
  if(!isObject(v))return `<span>${esc(format(v))}</span>`;
  if(identity(v))return record(v);
  return Object.entries(v).filter(([k,x])=>x!=null&&!internal(k)).map(([k,x])=>typeof x==='object'?section(k,x):`<div class="tracker-stat-row"><span>${esc(pretty(k))}</span><strong>${esc(format(x))}</strong></div>`).join('');
 }
 return draw(data);
}
root.DashboardDetails={render,system,image};
})(window);
