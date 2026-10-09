'use strict';
importScripts('prayer-math-engine.js','stat-todo-model.js','drop-rate-model.js','drop-source-info.js','drop-target-sources.js','drop-target-model.js');
let session,raw;
onmessage=({data})=>{try{
 if(data.raw){raw=data.raw;session=DropTargetModel.session(raw,PrayerMath);}
 if(!session)throw Error('Reload the calculator with your current export.');
 if(data.character==='all'){
  const id=session.parsed.characters[0].playerId;
  const built=DropTargetSources.build(session.parsed,session.save,id,PrayerMath);
  const sources=built.candidates.filter(c=>[c.path,...(c.extraPatches||[]).map(p=>p.path)].every(p=>!/_\d+$/.test(String(p[0])))&&!['Cards','Cards0'].includes(c.path[0]));
  postMessage({result:{overview:true,sources}});return;
 }
 postMessage({result:DropTargetModel.plan(raw,data.character,data.target,PrayerMath,progress=>postMessage({progress}),session)});
}catch(error){postMessage({error:error.message});}};
