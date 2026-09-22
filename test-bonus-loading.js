'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
async function main(){
 const workers=[],c={console,Promise,BeanValueEngine:{systems(){throw Error('Worker-backed pages must not decode again on the UI thread');}},Worker:class{constructor(){workers.push(this);}postMessage(){}terminate(){this.terminated=true;}}};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync('bonus-systems.js','utf8'),c);
 function host(page){let html='',writes=0;return{dataset:{page},isConnected:true,querySelector(){return{};},querySelectorAll(){return[];},get innerHTML(){return html;},set innerHTML(v){if(++writes>12)throw new Error('Repeated loading render');html=v;}};}
 const tick=()=>new Promise(r=>setImmediate(r));
 const raw={data:{test:'first-page'}},h=host('hole');
 let navigationRestored=0;h.bonusAfterRender=()=>navigationRestored++;
 c.BonusSystems.render(h,'holeStudies',raw);await tick();assert.match(h.innerHTML,/Loading account/);
 workers[0].onmessage({data:{groups:{holeStudies:[{name:'Study test',effect:'Study bonus',level:'Lv 4',status:'active'}]}}});await tick();
 assert.match(h.innerHTML,/Study test/,'A worker result must render without first warming the synchronous cache');
 assert.doesNotMatch(h.innerHTML,/Loading account|Could not decode/);
 assert.equal(navigationRestored,1,'Restore system tabs after async content replaces the loader');
 assert.equal(c.BonusSystems.getRows(raw).holeStudies[0].name,'Study test','Reuse worker rows in synchronous consumers');
 const empty=host('votes');c.BonusSystems.render(empty,'votes',{});await tick();assert.doesNotMatch(empty.innerHTML,/Loading account|Could not decode/);
 // Re-importing while the same page is open must not display an old save.
 const same=host('holeStudies'),old={id:'old'},fresh={id:'fresh'};
 c.BonusSystems.render(same,'holeStudies',old);await tick();const oldWorker=workers.at(-1);
 c.BonusSystems.render(same,'holeStudies',fresh);await tick();const freshWorker=workers.at(-1);
 freshWorker.onmessage({data:{groups:{holeStudies:[{name:'Fresh save',level:'Lv 9',status:'active'}]}}});await tick();
 oldWorker.onmessage({data:{groups:{holeStudies:[{name:'Stale save',level:'Lv 1',status:'active'}]}}});await tick();assert.match(same.innerHTML,/Fresh save/);assert.doesNotMatch(same.innerHTML,/Stale save/);
 const left=host('votes');c.BonusSystems.render(left,'votes',{id:'leave'});await tick();left.dataset.page='cards';left.innerHTML='CARDS';workers.at(-1).onmessage({data:{groups:{}}});await tick();assert.equal(left.innerHTML,'CARDS');
 console.log('Bonus loading: first-page worker render, empty saves, replacement saves and navigation guards OK');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
