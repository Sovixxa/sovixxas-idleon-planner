'use strict';
importScripts('prayer-math-engine.js','prayer-model.js');
let context=null,revision=0;
onmessage=async event=>{
 const request=event.data,token=++revision;
 try{
  if(request.raw){context=PrayerModel.context(request.raw);postMessage({type:'roster',requestId:request.requestId,roster:PrayerModel.roster(context),slots:context.slots,passive:context.passive,targets:PrayerModel.targets(context)});}
  if(request.initialize)return;
  if(!context)throw new Error('Load a JSON save first.');
  const result=await PrayerModel.analyze(context,request.characterId??0,request.goal||'combat',progress=>{
    if(token!==revision)throw new Error('Superseded');
    postMessage({type:'progress',requestId:request.requestId,...progress});
  },request.planning||{});
  if(token===revision)postMessage({type:'result',requestId:request.requestId,result});
 }catch(error){if(token===revision){
  let stats=null;try{const ch=context?.characters.find(c=>c.playerId===(request.characterId??0));if(ch)stats=PrayerModel.evaluate(context,ch.playerId,ch.activePrayers.map(p=>p.prayerIndex)).stats;}catch{}
  postMessage({type:'error',requestId:request.requestId,error:error.message,stats});
 }}
};
