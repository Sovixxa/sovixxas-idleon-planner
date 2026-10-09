(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const aliases={coral:'coralReef',shinyPets:'breeding',holeMeasurements:'hole',holeSchematics:'hole',holeMonuments:'hole',holeFountain:'hole',shrines:'construction',characters:'familyBonuses',vials:'alchemy',sigils:'alchemy'};
function source(c){
 const assets=root.DashboardAssets||{},id=String(c.icon||'').replace(/^assets\//,'').replace(/\.png$/,'');
 if(assets[id])return assets[id];
 if(assets[id+'_x1'])return assets[id+'_x1'];
 const page=aliases[c.page]||c.page||'',nav=root.document?.getElementById('nav'+page.charAt(0).toUpperCase()+page.slice(1));
 return nav?.querySelector('img')?.getAttribute('src')||assets['nav-'+page.charAt(0).toUpperCase()+page.slice(1)]||'assets/TalentPoint1.png';
}
function html(c){return `<span class="upgrade-identity"><img class="upgrade-source-icon" src="${esc(source(c))}" alt="" width="28" height="28" loading="lazy" decoding="async"><span>${esc(c.name)}</span></span>`;}
root.UpgradeIcons={source,html};
})(typeof window!=='undefined'?window:globalThis);
